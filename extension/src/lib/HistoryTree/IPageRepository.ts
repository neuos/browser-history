import { Page } from "@/lib/HistoryTree/HistoryNode";

export interface IPageRepository {

    /**
     * Adds a new page or updates an existing one in the repository.
     * If the page already exists, it updates the existing entry.
     * It only updates the properties that are defined in the given Page object.
     * @param page 
     */
    addOrUpdate(page: Page): Promise<void>;

    /**
     * Retrieves a page by its URL.
     * @param url The URL of the page to retrieve.
     * @returns A Promise that resolves to the Page object if found, or undefined if not found.
     */
    get(url: string): Promise<Page | undefined>;

    /**
     * Retrieves all pages in the repository.
     * @returns A Promise that resolves to an array of Page objects.
     */
    getAll(): Promise<Page[]>;
}
