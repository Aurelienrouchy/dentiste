export interface Document {
  id: string;
  type: string;
  content: string;
  patientName: string;
  date: string;
  createdAt: Date;
}

export interface DocumentType {
  id: string;
  name: string;
  description: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  content: string;
  type: string;
}
