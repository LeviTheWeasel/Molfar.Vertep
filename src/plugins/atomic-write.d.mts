/**
 * Write a text file so a reader sees the old content or the new, never a gap (#243).
 * `newFileMode`: permissions for a file that does not exist yet (an existing file keeps its own).
 */
export function writeFileAtomic(full: string, content: string, newFileMode?: number): void;
