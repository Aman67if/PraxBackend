import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppError } from '../utils/AppError';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'praxes-uploads';

export async function uploadToS3(
  fileBuffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      })
    );

    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
  } catch (err) {
    throw new AppError('Failed to upload file to S3.', 500);
  }
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err) {
    // Log but don't throw — non-critical
    console.error('Failed to delete from S3:', key, err);
  }
}

export default s3Client;
