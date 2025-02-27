import { drizzle } from 'drizzle-orm/bun-sqlite';
import { eq, count } from 'drizzle-orm';
import { join, dirname } from 'path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { mkdir } from 'fs/promises';
import Database from 'bun:sqlite';
import { fileURLToPath } from 'url';
import * as schema from '../session/db/schema';
import { createLogger, type Logger } from '@mandrake/utils';

const MIGRATIONS_PATH = process.env.NODE_ENV === 'test'
    ? '../session/db/migrations'  // Source context for workspace tests
    : join(__dirname, '../migrations');  // Built context for dependents
type Session = typeof schema.sessions.$inferSelect;
type Request = typeof schema.requests.$inferSelect;
type Response = typeof schema.responses.$inferSelect;
type Round = typeof schema.rounds.$inferSelect;
type Turn = typeof schema.turns.$inferSelect;

export class SessionManager {
    private db!: ReturnType<typeof drizzle>;
    private sqlite!: Database;
    private dbPath: string;
    private initialized: boolean = false;
    private logger: Logger;
    
    // Event emitter for turn updates
    private turnUpdateListeners = new Map<string, Set<(turn: Turn) => void>>();
    
    constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.logger = createLogger('session').child({
            meta: {
                component: 'session-manager',
                dbPath
            }
        });
    }

    public async init(): Promise<void> {
        if (this.initialized) return;
        
        // Ensure parent directory exists
        try {
            await mkdir(dirname(this.dbPath), { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create database directory: ${ error } `);
        }
        
        // Create SQLite database with WAL mode and foreign keys enabled
        try {
            this.sqlite = new Database(this.dbPath);
            this.sqlite.exec('PRAGMA journal_mode = WAL;');
            this.sqlite.exec('PRAGMA foreign_keys = ON;');
        } catch (error) {
            throw new Error(`Failed to initialize database: ${ error } `);
        }
        
        // Create drizzle instance
        this.db = drizzle(this.sqlite, { schema });
        
        // Run migrations
        try {
            const __dirname = dirname(fileURLToPath(import.meta.url));
            await migrate(this.db, {
                migrationsFolder: join(__dirname, MIGRATIONS_PATH),
            });
        } catch (error) {
            throw new Error(`Failed to run migrations: ${ error } `);
        }

        this.initialized = true;
    }

    private ensureInitialized() {
        if (!this.initialized) {
            throw new Error('SessionManager not initialized. Call init() first.');
        }
    }

    // Session Operations
    async createSession(opts: {
        title?: string;
        description?: string;
        metadata?: Record<string, string>;
    }): Promise<Session> {
        this.ensureInitialized();
        const [session] = await this.db.insert(schema.sessions).values({
            title: opts.title,
            description: opts.description,
            metadata: JSON.stringify(opts.metadata || {})
        }).returning();

        if (!session) {
            throw new Error('Failed to create session');
        }

        return session;
    }

    async getSession(id: string): Promise<Session> {
        this.ensureInitialized();
        const [session] = await this.db
            .select()
            .from(schema.sessions)
            .where(eq(schema.sessions.id, id));

        if (!session) {
            throw new Error(`Session not found: ${ id } `);
        }
        return session;
    }

    async renderSessionHistory(id: string): Promise<{
        session: Session;
        rounds: (Round & {
            request: Request;
            response: Response & {
                turns: (Turn & { parsedToolCalls: import('../session/db/schema/turns').ToolCall })[];
            };
        })[];
    }> {
        const session = await this.getSession(id);
        const rounds = await this.listRounds(session.id);

        const roundsWithData = await Promise.all(
            rounds.map(async (round) => {
                const { request, response } = await this.getRound(round.id);
                const turns = await this.listTurnsWithParsedToolCalls(response.id);

                return {
                    ...round,
                    request,
                    response: {
                        ...response,
                        turns
                    }
                };
            })
        );

        return {
            session,
            rounds: roundsWithData
        };
    }

    async listSessions(opts?: {
        limit?: number;
        offset?: number;
    }): Promise<Session[]> {
        this.ensureInitialized();
        let query = this.db.select().from(schema.sessions);

        // TODO: Add limit/offset handling

        return query;
    }

    async updateSession(id: string, updates: {
        title?: string;
        description?: string;
        metadata?: Record<string, string>;
    }): Promise<Session> {
        this.ensureInitialized();
        const [session] = await this.db.update(schema.sessions)
            .set({
                ...updates,
                metadata: updates.metadata ? JSON.stringify(updates.metadata) : undefined
            })
            .where(eq(schema.sessions.id, id))
            .returning();

        if (!session) {
            throw new Error(`Session not found: ${ id } `);
        }

        return session;
    }

    async deleteSession(id: string): Promise<void> {
        this.ensureInitialized();
        await this.db.delete(schema.sessions)
            .where(eq(schema.sessions.id, id));
    }

    // Round Operations
    async createRound(opts: {
        sessionId: string;
        content: string;  // Request content
    }): Promise<{
        round: Round;
        request: Request;
        response: Response;
    }> {
        this.ensureInitialized();
        const [request] = await this.db.insert(schema.requests)
            .values({
                content: opts.content
            })
            .returning();

        if (!request) {
            throw new Error('Failed to create request');
        }

        // Create response
        const [response] = await this.db.insert(schema.responses)
            .values({})
            .returning();

        if (!response) {
            throw new Error('Failed to create response');
        }

        // Create round linking them together
        const [round] = await this.db.insert(schema.rounds)
            .values({
                sessionId: opts.sessionId,
                requestId: request.id,
                responseId: response.id,
                index: 0 // TODO: Calculate proper index
            })
            .returning();

        if (!round) {
            throw new Error('Failed to create round');
        }

        return { round, request, response };
    }

    async getRound(id: string): Promise<{
        round: Round;
        request: Request;
        response: Response;
    }> {
        this.ensureInitialized();
        const [round] = await this.db
            .select()
            .from(schema.rounds)
            .where(eq(schema.rounds.id, id));

        if (!round) {
            throw new Error(`Round not found: ${ id } `);
        }

        // Get associated request
        const [request] = await this.db
            .select()
            .from(schema.requests)
            .where(eq(schema.requests.id, round.requestId));

        if (!request) {
            throw new Error(`Request not found: ${ round.requestId } `);
        }

        // Get associated response
        const [response] = await this.db
            .select()
            .from(schema.responses)
            .where(eq(schema.responses.id, round.responseId));

        if (!response) {
            throw new Error(`Response not found: ${ round.responseId } `);
        }

        return { round, request, response };
    }

    async listRounds(sessionId: string): Promise<Round[]> {
        this.ensureInitialized();
        return this.db
            .select()
            .from(schema.rounds)
            .where(eq(schema.rounds.sessionId, sessionId));
    }

    // Turn Operations
    async createTurn(opts: {
        responseId: string;
        content: string;
        rawResponse: string;
        toolCalls?: import('../session/db/schema/turns').ToolCall;
        status?: 'streaming' | 'completed' | 'error';
        inputTokens: number;
        outputTokens: number;
        inputCost: number;
        outputCost: number;
    }): Promise<Turn> {
        this.ensureInitialized();
        const existingTurns = await this.db
            .select({ count: count() })
            .from(schema.turns)
            .where(eq(schema.turns.responseId, opts.responseId));

        const turnIndex = existingTurns[0]?.count || 0;

        const [turn] = await this.db.insert(schema.turns)
            .values({
                responseId: opts.responseId,
                index: turnIndex,
                rawResponse: opts.rawResponse,
                content: opts.content,
                toolCalls: JSON.stringify(opts.toolCalls || { call: null, response: null }),
                status: opts.status || 'streaming',
                inputTokens: opts.inputTokens,
                outputTokens: opts.outputTokens,
                inputCost: opts.inputCost,
                outputCost: opts.outputCost,
                streamStartTime: Math.floor(Date.now() / 1000)
            })
            .returning();

        if (!turn) {
            throw new Error('Failed to create turn');
        }

        return turn;
    }

    async updateTurn(id: string, updates: {
        // Content fields
        rawResponse?: string;
        content?: string;
        toolCalls?: import('../session/db/schema/turns').ToolCall;

        // Streaming status fields  
        status?: 'streaming' | 'completed' | 'error';
        streamEndTime?: number;
        currentTokens?: number;
        expectedTokens?: number;

        // Token metrics
        inputTokens?: number;
        outputTokens?: number;
        cacheReadTokens?: number;
        cacheWriteTokens?: number;
        inputCost?: number;
        outputCost?: number;
    }): Promise<Turn> {
        this.ensureInitialized();

        const updateData: any = { ...updates };

        // Handle JSON stringification
        if (updates.content) {
            updateData.content = updates.content;
        }
        if (updates.toolCalls) {
            updateData.toolCalls = JSON.stringify(updates.toolCalls);
        }

        // Set updated timestamp
        updateData.updatedAt = new Date(Date.now());

        const [turn] = await this.db.update(schema.turns)
            .set(updateData)
            .where(eq(schema.turns.id, id))
            .returning();

        if (!turn) {
            throw new Error(`Turn not found: ${ id } `);
        }

        // Notify any listeners
        this.notifyTurnListeners(id, turn);

        return turn;
    }
    
    async getLatestTurn(responseId: string): Promise<Turn | null> {
        this.ensureInitialized();
        const [turn] = await this.db
            .select()
            .from(schema.turns)
            .where(eq(schema.turns.responseId, responseId))
            .orderBy(schema.turns.index);

        return turn || null;
    }

    async getTurn(id: string): Promise<Turn> {
        this.ensureInitialized();
        const [turn] = await this.db
            .select()
            .from(schema.turns)
            .where(eq(schema.turns.id, id));

        if (!turn) {
            throw new Error(`Turn not found: ${ id } `);
        }
        return turn;
    }

    async deleteTurn(id: string): Promise<void> {
        this.ensureInitialized();
        await this.db.delete(schema.turns)
            .where(eq(schema.turns.id, id));
    }

    async listTurns(responseId: string): Promise<Turn[]> {
        this.ensureInitialized();
        return this.db
            .select()
            .from(schema.turns)
            .where(eq(schema.turns.responseId, responseId))
            .orderBy(schema.turns.index);
    }

    /**
     * List turns for a response with parsed toolCalls
     */
    async listTurnsWithParsedToolCalls(responseId: string): Promise<(Turn & { parsedToolCalls: import('../session/db/schema/turns').ToolCall })[]> {
        const turns = await this.listTurns(responseId);
        return turns.map(turn => ({
            ...turn,
            parsedToolCalls: this.parseToolCalls(turn.toolCalls)
        }));
    }

    /**
     * Parse toolCalls JSON string into a ToolCall object
     */
    private parseToolCalls(toolCallsJson: string): import('../session/db/schema/turns').ToolCall {
        try {
            return JSON.parse(toolCallsJson);
        } catch (error) {
            this.logger.warn('Failed to parse toolCalls JSON, returning empty tool call', { error });
            return { call: null, response: null };
        }
    }

    /**
     * Get a turn with parsed toolCalls
     */
    async getTurnWithParsedToolCalls(id: string): Promise<Turn & { parsedToolCalls: import('../session/db/schema/turns').ToolCall }> {
        const turn = await this.getTurn(id);
        return {
            ...turn,
            parsedToolCalls: this.parseToolCalls(turn.toolCalls)
        };
    }

    /**
     * Add a listener for turn updates
     * @param turnId Turn ID to listen for updates on
     * @param listener Callback function that will be called with the updated turn
     * @returns Function to remove the listener
     */
    addTurnUpdateListener(turnId: string, listener: (turn: Turn) => void): () => void {
        if (!this.turnUpdateListeners.has(turnId)) {
            this.turnUpdateListeners.set(turnId, new Set());
        }
        this.turnUpdateListeners.get(turnId)!.add(listener);
        return () => {
            const listeners = this.turnUpdateListeners.get(turnId);
            if (listeners) {
                listeners.delete(listener);
                if (listeners.size === 0) {
                    this.turnUpdateListeners.delete(turnId);
                }
            }
        };
    }

    /**
     * Notify listeners of turn updates
     */
    private notifyTurnListeners(turnId: string, turn: Turn): void {
        const listeners = this.turnUpdateListeners.get(turnId);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(turn);
                } catch (error) {
                    this.logger.error('Error in turn update listener', { turnId, error });
                }
            });
        }
    }

    /**
     * Track streaming turns and receive updates
     * @param responseId ID of the response to track turns for
     * @param onUpdate Callback function that will be called with each turn update
     * @returns Function to stop tracking
     */
    trackStreamingTurns(responseId: string, onUpdate: (turn: Turn) => void): () => void {
        this.ensureInitialized();
        
        // Set up listeners for existing and future turns
        const listeners: Array<() => void> = [];
        
        // Function to check for new turns
        const checkForNewTurns = async () => {
            const turns = await this.listTurns(responseId);
            
            // For each turn, add a listener if it's not already being tracked
            for (const turn of turns) {
                if (!this.turnUpdateListeners.has(turn.id)) {
                    const removeListener = this.addTurnUpdateListener(turn.id, onUpdate);
                    listeners.push(removeListener);
                    
                    // Immediately notify with current state
                    onUpdate(turn);
                }
            }
            
            // Check if all turns are complete
            const allComplete = turns.every(turn => turn.status !== 'streaming');
            if (allComplete && turns.length > 0) {
                // If all turns are complete, stop polling
                clearInterval(intervalId);
            }
        };
        
        // Start polling for new turns
        const intervalId = setInterval(checkForNewTurns, 500);
        checkForNewTurns(); // Check immediately
        
        // Return function to stop tracking
        return () => {
            clearInterval(intervalId);
            listeners.forEach(removeListener => removeListener());
        };
    }

    /**
     * Get the status of all turns for a response
     */
    async getStreamingStatus(responseId: string): Promise<{
        isComplete: boolean;
        turns: Turn[];
    }> {
        this.ensureInitialized();
        const turns = await this.listTurns(responseId);
        const isComplete = turns.every(turn => turn.status !== 'streaming');
        return { isComplete, turns };
    }

    // Close database connection
    async close(): Promise<void> {
        if (this.initialized) {
            this.sqlite.close();
            this.initialized = false;
        }
    }

    // Delete the database file
    async delete(): Promise<void> {
        // Close first if open
        if (this.initialized) {
            await this.close();
        }

        // Remove database files
        await Bun.file(this.dbPath).delete().catch(() => { });
        await Bun.file(this.dbPath + '-shm').delete().catch(() => { });
        await Bun.file(this.dbPath + '-wal').delete().catch(() => { });
    }
}