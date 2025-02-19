import { drizzle } from 'drizzle-orm/bun-sqlite';
import { eq } from 'drizzle-orm';
import { join } from 'path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';
import Database from 'bun:sqlite';
import * as schema from '../session/db/schema';

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

    constructor(dbPath: string) {
        this.dbPath = dbPath;
    }

    public async init(): Promise<void> {
        if (this.initialized) return;

        // Ensure parent directory exists
        try {
            await mkdir(dirname(this.dbPath), { recursive: true });
        } catch (error) {
            throw new Error(`Failed to create database directory: ${error}`);
        }

        // Create SQLite database with WAL mode and foreign keys enabled
        try {
            this.sqlite = new Database(this.dbPath);
            this.sqlite.exec('PRAGMA journal_mode = WAL;');
            this.sqlite.exec('PRAGMA foreign_keys = ON;');
        } catch (error) {
            throw new Error(`Failed to initialize database: ${error}`);
        }

        // Create drizzle instance
        this.db = drizzle(this.sqlite, { schema });

        // Run migrations
        try {
            await migrate(this.db, {
                migrationsFolder: join(__dirname, '../session/db/migrations'),
            });
        } catch (error) {
            throw new Error(`Failed to run migrations: ${error}`);
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
        workspaceId?: string;
        title?: string;
        description?: string;
        metadata?: Record<string, string>;
    }): Promise<Session> {
        this.ensureInitialized();
        const [session] = await this.db.insert(schema.sessions).values({
            title: opts.title,
            description: opts.description,
            workspaceId: opts.workspaceId,
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
            throw new Error(`Session not found: ${id}`);
        }
        return session;
    }

    async renderSessionHistory(id: string): Promise<{
        session: Session;
        rounds: (Round & {
            request: Request;
            response: Response & {
                turns: Turn[];
            };
        })[];
    }> {
        const session = await this.getSession(id);
        const rounds = await this.listRounds(session.id);

        const roundsWithData = await Promise.all(
            rounds.map(async (round) => {
                const { request, response } = await this.getRound(round.id);
                const turns = await this.listTurns(response.id);

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
        workspaceId?: string;
        limit?: number;
        offset?: number;
    }): Promise<Session[]> {
        this.ensureInitialized();
        let query = this.db.select().from(schema.sessions);

        if (opts?.workspaceId) {
            query = query.where(eq(schema.sessions.workspaceId, opts.workspaceId)) as any;
        }

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
            throw new Error(`Session not found: ${id}`);
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
            throw new Error(`Round not found: ${id}`);
        }

        // Get associated request
        const [request] = await this.db
            .select()
            .from(schema.requests)
            .where(eq(schema.requests.id, round.requestId));

        if (!request) {
            throw new Error(`Request not found: ${round.requestId}`);
        }

        // Get associated response
        const [response] = await this.db
            .select()
            .from(schema.responses)
            .where(eq(schema.responses.id, round.responseId));

        if (!response) {
            throw new Error(`Response not found: ${round.responseId}`);
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
        content: string[];
        rawResponse: string;
        toolCalls?: {
            call: any;
            result: any;
        }[];
        status?: 'streaming' | 'completed' | 'error';
        inputTokens: number;
        outputTokens: number;
        inputCost: number;
        outputCost: number;
    }): Promise<Turn> {
        this.ensureInitialized();
        const [turn] = await this.db.insert(schema.turns)
            .values({
                responseId: opts.responseId,
                index: 0, // TODO: Calculate proper index
                rawResponse: opts.rawResponse,
                content: JSON.stringify(opts.content),
                toolCalls: JSON.stringify(opts.toolCalls || []),
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
        content?: string[];
        rawResponse?: string;
        toolCalls?: {
            call: any;
            result: any;
        }[];
        status?: 'streaming' | 'completed' | 'error';
        currentTokens?: number;
        expectedTokens?: number;
        streamEndTime?: number;
    }): Promise<Turn> {
        this.ensureInitialized();
        const updateData: any = { ...updates };
        if (updates.content) {
            updateData.content = JSON.stringify(updates.content);
        }
        if (updates.toolCalls) {
            updateData.toolCalls = JSON.stringify(updates.toolCalls);
        }

        const [turn] = await this.db.update(schema.turns)
            .set(updateData)
            .where(eq(schema.turns.id, id))
            .returning();

        if (!turn) {
            throw new Error(`Turn not found: ${id}`);
        }

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

    async listTurns(responseId: string): Promise<Turn[]> {
        this.ensureInitialized();
        return this.db
            .select()
            .from(schema.turns)
            .where(eq(schema.turns.responseId, responseId))
            .orderBy(schema.turns.index);
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