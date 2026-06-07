export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
};

export type MarkdownDocument = {
  id: string;
  name: string;
  content: string;
  folderId: string | null;
  createdAt: number;
};
