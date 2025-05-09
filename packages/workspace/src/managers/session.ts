import { drizzle } from 'drizzle-orm/bun-sqlite';
import { eq, count } from 'drizzle-orm';
import { join, dirname } from 'path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { mkdir } from 'fs/promises';
import Database from 'bun:sqlite';
import { fileURLToPath } from 'url';
import * as schema from '../session/db/schema';
import { 
  createLogger, 
  type Logger, 
  type ToolCall,
  type SessionEntity,
  type RequestEntity,
  type ResponseEntity,
  type RoundEntity,
  type TurnEntity,
  type TurnWithToolCallsEntity,
  type RoundWithDataEntity,
  type SessionHistoryEntity
} from '@mandrake/utils';
import * as mappers from '../session/mappers';

const MIGRATIONS_PATH = process.env.NODE_ENV === 'test'
    ? '../session/db/migrations'  // Source context for workspace tests
    : '../session/db/migrations';  // Built context for dependents
    
// DB types (internal use only)
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
    private turnUpdateListeners = new Map<string, Set<(turn: TurnEntity) => void>>();
    
    constructor(dbPath: string) {
        this.dbPath = dbPath;
        this.logger = createLogger('session').child({
            meta: {
                component: 'session-manager',
                dbPath
            }
        });
        this.logger.info(`Creating new SessionManager for ${dbPath}`);
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

    async getSession(id: string): Promise<SessionEntity> {
        this.ensureInitialized();
        const [session] = await this.db
            .select()
            .from(schema.sessions)
            .where(eq(schema.sessions.id, id));

        if (!session) {
            throw new Error(`Session not found: ${ id } `);
        }
        return mappers.mapSessionToEntity(session);
    }

    async renderSessionHistory(id: string): Promise<SessionHistoryEntity> {
        const session = await this.getSession(id);
        const rounds = await this.listRounds(session.id);

        const roundsWithData = await Promise.all(
            rounds.map(async (round) => {
                const { request, response } = await this.getRound(round.id);
                const turns = await this.listTurnsWithParsedToolCalls(response.id);

                return {
                    ...mappers.mapRoundToEntity(round),
                    request: mappers.mapRequestToEntity(request),
                    response: {
                        ...mappers.mapResponseToEntity(response),
                        turns
                    }
                };
            })
        );

        return {
            session,
            rounds: roundsWithData as RoundWithDataEntity[]
        };
    }

    async listSessions(opts?: {
        limit?: number;
        offset?: number;
    }): Promise<SessionEntity[]> {
        this.ensureInitialized();
        let query = this.db.select().from(schema.sessions);

        // TODO: Add limit/offset handling

        const sessions = await query;
        return sessions.map(mappers.mapSessionToEntity);
    }

    async updateSession(id: string, updates: {
        title?: string;
        description?: string;
        metadata?: Record<string, string>;
    }): Promise<SessionEntity> {
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

        return mappers.mapSessionToEntity(session);
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
        round: RoundEntity;
        request: RequestEntity;
        response: ResponseEntity;
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

        return { 
            round: mappers.mapRoundToEntity(round), 
            request: mappers.mapRequestToEntity(request), 
            response: mappers.mapResponseToEntity(response) 
        };
    }

    async getRound(id: string): Promise<{
        round: RoundEntity;
        request: RequestEntity;
        response: ResponseEntity;
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

        return { 
            round: mappers.mapRoundToEntity(round), 
            request: mappers.mapRequestToEntity(request), 
            response: mappers.mapResponseToEntity(response) 
        };
    }

    async listRounds(sessionId: string): Promise<RoundEntity[]> {
        this.ensureInitialized();
        const rounds = await this.db
            .select()
            .from(schema.rounds)
            .where(eq(schema.rounds.sessionId, sessionId));
            
        return rounds.map(mappers.mapRoundToEntity);
    }

    // Turn Operations
    async createTurn(opts: {
        responseId: string;
        index?: number;
        content: string;
        rawResponse: string;
        toolCalls?: string | ToolCall;
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

        const turnIndex = opts.index !== undefined ? opts.index : (existingTurns[0]?.count || 0);

        const [turn] = await this.db.insert(schema.turns)
            .values({
                responseId: opts.responseId,
                index: turnIndex,
                rawResponse: opts.rawResponse,
                content: opts.content,
                toolCalls: typeof opts.toolCalls === 'string' ? opts.toolCalls : JSON.stringify(opts.toolCalls || { call: null, response: null }),
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
        toolCalls?: ToolCall;

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

        updateData.updatedAt = new Date(Date.now());

        const [turn] = await this.db.update(schema.turns)
            .set(updateData)
            .where(eq(schema.turns.id, id))
            .returning();

        if (!turn) {
            throw new Error(`Turn not found: ${ id } `);
        }

        this.notifyTurnListeners(id, turn);

        return turn;
    }
    
    async getLatestTurn(responseId: string): Promise<TurnEntity | null> {
        this.ensureInitialized();
        const [turn] = await this.db
            .select()
            .from(schema.turns)
            .where(eq(schema.turns.responseId, responseId))
            .orderBy(schema.turns.index);

        return turn ? mappers.mapTurnToEntity(turn) : null;
    }

    async getTurn(id: string): Promise<TurnEntity> {
        this.ensureInitialized();
        const [turn] = await this.db
            .select()
            .from(schema.turns)
            .where(eq(schema.turns.id, id));

        if (!turn) {
            throw new Error(`Turn not found: ${ id } `);
        }
        return mappers.mapTurnToEntity(turn);
    }

    async deleteTurn(id: string): Promise<void> {
        this.ensureInitialized();
        await this.db.delete(schema.turns)
            .where(eq(schema.turns.id, id));
    }
    
    async getRequest(id: string): Promise<RequestEntity> {
        this.ensureInitialized();
        const [request] = await this.db
            .select()
            .from(schema.requests)
            .where(eq(schema.requests.id, id));

        if (!request) {
            throw new Error(`Request not found: ${ id } `);
        }
        return mappers.mapRequestToEntity(request);
    }
    
    async getResponse(id: string): Promise<ResponseEntity> {
        this.ensureInitialized();
        const [response] = await this.db
            .select()
            .from(schema.responses)
            .where(eq(schema.responses.id, id));

        if (!response) {
            throw new Error(`Response not found: ${ id } `);
        }
        return mappers.mapResponseToEntity(response);
    }

    async listTurns(responseId: string): Promise<TurnEntity[]> {
        this.ensureInitialized();
        const turns = await this.db
            .select()
            .from(schema.turns)
            .where(eq(schema.turns.responseId, responseId))
            .orderBy(schema.turns.index);
            
        return turns.map(mappers.mapTurnToEntity);
    }

    /**
     * List turns for a response with parsed toolCalls
     */
    async listTurnsWithParsedToolCalls(responseId: string): Promise<TurnWithToolCallsEntity[]> {
        const turns = await this.listTurns(responseId);
        return turns.map(turn => ({
            ...turn,
            parsedToolCalls: mappers.parseToolCalls(typeof turn.toolCalls === 'string' ? turn.toolCalls : JSON.stringify(turn.toolCalls))
        }));
    }

    /**
     * Get a turn with parsed toolCalls
     */
    async getTurnWithParsedToolCalls(id: string): Promise<TurnWithToolCallsEntity> {
        const turn = await this.getTurn(id);
        return {
            ...turn,
            parsedToolCalls: mappers.parseToolCalls(typeof turn.toolCalls === 'string' ? turn.toolCalls : JSON.stringify(turn.toolCalls))
        };
    }

    /**
     * Add a listener for turn updates
     * @param turnId Turn ID to listen for updates on
     * @param listener Callback function that will be called with the updated turn
     * @returns Function to remove the listener
     */
    addTurnUpdateListener(turnId: string, listener: (turn: TurnEntity) => void): () => void {
        if (!this.turnUpdateListeners.has(turnId)) {
            this.turnUpdateListeners.set(turnId, new Set());
        }
        const listeners = this.turnUpdateListeners.get(turnId)!;
        listeners.add(listener);
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
            const turnEntity = mappers.mapTurnToEntity(turn);
            listeners.forEach(listener => {
                try {
                    listener(turnEntity);
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
    trackStreamingTurns(responseId: string, onUpdate: (turn: TurnEntity) => void): () => void {
        this.ensureInitialized();
        const listeners: Array<() => void> = [];

        // Function to check for new turns and set up streaming
        const checkForNewTurns = async () => {
            const turns = await this.listTurns(responseId);

            // For each turn, add a listener immediately to catch all updates
            for (const turn of turns) {
                if (!this.turnUpdateListeners.has(turn.id)) {
                    const removeListener = this.addTurnUpdateListener(turn.id, (updatedTurn) => {
                        // Always notify of updates - chunks, tool calls, status changes
                        onUpdate(updatedTurn);
                    });
                    listeners.push(removeListener);
                    // Immediately notify with current state
                    const currentTurn = await this.getTurn(turn.id);
                    onUpdate(currentTurn);
                }
            }

            // Check if complete to stop polling
            const allComplete = turns.every(turn =>
                turn.status === 'completed' || turn.status === 'error'
            );
            if (allComplete && turns.length > 0) {
                clearInterval(intervalId);
            }
        };

        // Poll for new turns but stream updates within turns
        const intervalId = setInterval(checkForNewTurns, 500);
        checkForNewTurns(); // Check immediately

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
        turns: TurnEntity[];
    }> {
        this.ensureInitialized();
        const turns = await this.listTurns(responseId);
        const isComplete = turns.every(turn => turn.status !== 'streaming');
        return { isComplete, turns };
    }

    // Close database connection
    async close(): Promise<void> {
        if (this.initialized) {
            this.logger.info(`Closing SessionManager for ${this.dbPath}`);
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