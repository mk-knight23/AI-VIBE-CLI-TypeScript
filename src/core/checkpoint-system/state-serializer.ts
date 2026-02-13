/**
 * VIBE-CLI v0.0.2 - State Serializer
 * Serializes and deserializes code state with gzip compression
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Serialization format options
 */
export type SerializationFormat = 'json' | 'json-gzip' | 'binary';

/**
 * Serialization options
 */
export interface SerializationOptions {
  format?: SerializationFormat;
  includeMetadata?: boolean;
  maxFileSize?: number; // bytes - skip files larger than this
}

/**
 * Serialization result
 */
export interface SerializationResult {
  success: boolean;
  data?: Buffer;
  metadata?: SerializedMetadata;
  error?: string;
}

/**
 * Deserialization result
 */
export interface DeserializationResult {
  success: boolean;
  data?: Map<string, string>;
  metadata?: SerializedMetadata;
  error?: string;
}

/**
 * Metadata for serialized state
 */
export interface SerializedMetadata {
  version: string;
  createdAt: string;
  description?: string;
  fileCount: number;
  totalSize: number;
  compressedSize: number;
  format: SerializationFormat;
  checksum: string;
}

/**
 * State Serializer with gzip compression
 * Provides efficient compression for checkpoint storage
 */
export class StateSerializer {
  private readonly version = '1.0.0';
  private readonly defaultMaxFileSize = 10 * 1024 * 1024; // 10MB

  /**
   * Serialize a map of file paths to content
   */
  async serialize(
    fileContents: Map<string, string>,
    options: SerializationOptions = {}
  ): Promise<SerializationResult> {
    const {
      format = 'json-gzip',
      includeMetadata = true,
      maxFileSize = this.defaultMaxFileSize,
    } = options;

    try {
      // Filter files by size
      const filteredFiles = new Map<string, string>();
      let totalSize = 0;

      for (const [filePath, content] of fileContents) {
        const size = Buffer.byteLength(content, 'utf-8');
        if (size <= maxFileSize) {
          filteredFiles.set(filePath, content);
          totalSize += size;
        }
      }

      // Create the data object
      const dataObj: Record<string, string> = {};
      for (const [filePath, content] of filteredFiles) {
        dataObj[filePath] = content;
      }

      let output: Buffer;
      let compressedSize = 0;

      if (format === 'binary') {
        output = Buffer.from(JSON.stringify(dataObj), 'utf-8');
      } else if (format === 'json-gzip') {
        const jsonStr = JSON.stringify(dataObj);
        output = await gzip(Buffer.from(jsonStr, 'utf-8'));
        compressedSize = output.length;
      } else {
        output = Buffer.from(JSON.stringify(dataObj, null, 2), 'utf-8');
      }

      // Calculate HMAC for integrity (P2-021)
      const checksum = this.calculateHMAC(output);

      const metadata: SerializedMetadata = {
        version: this.version,
        createdAt: new Date().toISOString(),
        fileCount: filteredFiles.size,
        totalSize,
        compressedSize: format === 'json-gzip' ? compressedSize : totalSize,
        format,
        checksum,
      };

      if (includeMetadata) {
        const metadataStr = JSON.stringify(metadata);
        const metadataBuffer = Buffer.from(metadataStr, 'utf-8');
        const headerLength = Buffer.alloc(4);
        headerLength.writeUInt32BE(metadataBuffer.length);

        if (format === 'json-gzip') {
          const combined = Buffer.concat([headerLength, metadataBuffer, output]);
          return { success: true, data: combined, metadata };
        }
      }

      return { success: true, data: output, metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown serialization error',
      };
    }
  }

  /**
   * Deserialize data back to file contents map
   */
  async deserialize(
    data: Buffer,
    expectedFormat: SerializationFormat = 'json-gzip'
  ): Promise<DeserializationResult> {
    try {
      let jsonStr: string;
      let metadata: SerializedMetadata | undefined;

      if (expectedFormat === 'json-gzip') {
        // Read header for metadata length
        const headerLength = data.readUInt32BE(0);
        const metadataBuffer = data.slice(4, 4 + headerLength);
        const parsedMetadata = JSON.parse(metadataBuffer.toString('utf-8'));

        // Verify HMAC for integrity (P2-021)
        const compressedData = data.slice(4 + headerLength);
        const checksum = this.calculateHMAC(compressedData);
        if (checksum !== parsedMetadata.checksum) {
          return { success: false, error: 'Integrity verification failed - data may be tampered with' };
        }

        const decompressed = await gunzip(compressedData);
        jsonStr = decompressed.toString('utf-8');
        metadata = parsedMetadata;
      } else if (expectedFormat === 'binary') {
        jsonStr = data.toString('utf-8');
      } else {
        jsonStr = data.toString('utf-8');
      }

      const dataObj = JSON.parse(jsonStr);
      const fileContents = new Map<string, string>();

      for (const [filePath, content] of Object.entries(dataObj)) {
        fileContents.set(filePath, content as string);
      }

      return { success: true, data: fileContents, metadata };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown deserialization error',
      };
    }
  }

  /**
   * Serialize to file
   */
  async serializeToFile(
    fileContents: Map<string, string>,
    filePath: string,
    options: SerializationOptions = {}
  ): Promise<SerializationResult> {
    const result = await this.serialize(fileContents, options);

    if (result.success && result.data) {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      // Ensure directory exists
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(absolutePath, result.data);
    }

    return result;
  }

  /**
   * Deserialize from file
   */
  async deserializeFromFile(
    filePath: string,
    expectedFormat: SerializationFormat = 'json-gzip'
  ): Promise<DeserializationResult> {
    try {
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      if (!fs.existsSync(absolutePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      const data = fs.readFileSync(absolutePath);
      return await this.deserialize(data, expectedFormat);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file',
      };
    }
  }

  /**
   * Calculate HMAC for data integrity and authenticity
   */
  private calculateHMAC(data: Buffer): string {
    const secret = process.env.VIBE_CHECKPOINT_SECRET || process.env.VIBE_API_KEY || 'vibe-default-secret';
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(originalSize: number, compressedSize: number): {
    ratio: number;
    percentage: string;
  } {
    if (originalSize === 0) {
      return { ratio: 1, percentage: '0%' };
    }
    const ratio = compressedSize / originalSize;
    const percentage = ((1 - ratio) * 100).toFixed(1);
    return { ratio, percentage: `${percentage}%` };
  }
}

/**
 * Singleton instance
 */
export const stateSerializer = new StateSerializer();
