import { Collection, ObjectId, Filter, UpdateFilter, FindOptions } from 'mongodb';
import { database } from '../database';

export abstract class BaseService<T> {
  protected collection: Collection<T>;

  constructor(collectionName: string) {
    this.collection = database.getCollection<T>(collectionName);
  }

  // Create a new document
  async create(data: Omit<T, '_id'>): Promise<T> {
    const document = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    } as T;

    const result = await this.collection.insertOne(document);
    return { ...document, _id: result.insertedId } as T;
  }

  // Find document by ID
  async findById(id: string): Promise<T | null> {
    // Use application-level id field (not Mongo _id)
    return await this.collection.findOne({ id } as Filter<T>);
  }

  // Find all documents with optional filter
  async findAll(filter: Filter<T> = {}, options: FindOptions<T> = {}): Promise<T[]> {
    return await this.collection.find(filter, options).toArray();
  }

  // Update document by ID
  async updateById(id: string, update: Partial<T>): Promise<T | null> {
    const updateDoc = {
      ...update,
      updatedAt: new Date()
    } as UpdateFilter<T>;

    const result = await this.collection.findOneAndUpdate(
      // Use application-level id field (not Mongo _id)
      { id } as Filter<T>,
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    // findOneAndUpdate returns a ModifyResult; the updated doc is in value
    return (result && (result as any).value) || null;
  }

  // Delete document by ID
  async deleteById(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id } as Filter<T>);
    return result.deletedCount === 1;
  }

  // Count documents
  async count(filter: Filter<T> = {}): Promise<number> {
    return await this.collection.countDocuments(filter);
  }

  // Check if document exists
  async exists(filter: Filter<T>): Promise<boolean> {
    const count = await this.collection.countDocuments(filter, { limit: 1 });
    return count > 0;
  }
}
