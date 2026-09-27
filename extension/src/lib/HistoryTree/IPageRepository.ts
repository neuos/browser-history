import { Page } from "@/lib/HistoryTree/HistoryNode";

export interface IPageRepository {
    /** Only overwrites properties that are defined on the given Page. */
    addOrUpdate(page: Page): Promise<void>;

    get(url: string): Promise<Page | undefined>;

    getAll(): Promise<Page[]>;

    /** Removes every page from the repository. */
    clear(): Promise<void>;
}
