import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { Folder, MarkdownDocument } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (errInfo.error.includes("Missing or insufficient permissions")) {
    alert("データベースへのアクセス権限がありません。アクセスするには、ページをリロードして再試行してください。");
  }
  throw new Error(JSON.stringify(errInfo));
}

export const generateId = (): string => {
  return doc(collection(db, 'temp')).id;
};

// Folders
export const subscribeToFolders = (userId: string, callback: (folders: Folder[]) => void) => {
  const path = `users/${userId}/folders`;
  const q = query(collection(db, path), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const folders: Folder[] = [];
    snapshot.forEach((doc) => {
      folders.push({ id: doc.id, ...doc.data() } as Folder);
    });
    callback(folders);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const updateFolder = async (userId: string, folder: Folder) => {
  const path = `users/${userId}/folders/${folder.id}`;
  try {
    const { id, ...data } = folder;
    await setDoc(doc(db, `users/${userId}/folders`, folder.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const createFolder = async (userId: string, folder: Folder) => {
  const path = `users/${userId}/folders/${folder.id}`;
  try {
    const { id, ...data } = folder;
    await setDoc(doc(db, `users/${userId}/folders`, folder.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteFolder = async (userId: string, folderId: string) => {
  const path = `users/${userId}/folders/${folderId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Documents
export const subscribeToDocuments = (userId: string, callback: (documents: MarkdownDocument[]) => void) => {
  const path = `users/${userId}/documents`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const docs: MarkdownDocument[] = [];
    snapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() } as MarkdownDocument);
    });
    callback(docs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const updateDocument = async (userId: string, document: MarkdownDocument) => {
  const path = `users/${userId}/documents/${document.id}`;
  try {
    const { id, ...data } = document;
    await setDoc(doc(db, `users/${userId}/documents`, document.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const createDocument = async (userId: string, document: MarkdownDocument) => {
  const path = `users/${userId}/documents/${document.id}`;
  try {
    const { id, ...data } = document;
    await setDoc(doc(db, `users/${userId}/documents`, document.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const deleteDocument = async (userId: string, documentId: string) => {
  const path = `users/${userId}/documents/${documentId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
