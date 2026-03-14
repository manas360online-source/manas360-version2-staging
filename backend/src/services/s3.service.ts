import { randomUUID } from 'crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

const clientConfig = {
	region: env.awsRegion,
	...(env.awsAccessKeyId && env.awsSecretAccessKey
		? {
			credentials: {
				accessKeyId: env.awsAccessKeyId,
				secretAccessKey: env.awsSecretAccessKey,
			},
		}
		: {}),
};

export const s3Client = new S3Client(clientConfig);

const getExtensionFromMimeType = (mimeType: string): 'jpg' | 'jpeg' | 'png' => {
	if (mimeType === 'image/jpeg') {
		return 'jpg';
	}

	if (mimeType === 'image/png') {
		return 'png';
	}

	throw new AppError('Unsupported file format', 400);
};

const getDocumentExtensionFromMimeType = (mimeType: string): 'pdf' | 'jpg' | 'png' => {
	if (mimeType === 'application/pdf') {
		return 'pdf';
	}

	if (mimeType === 'image/jpeg') {
		return 'jpg';
	}

	if (mimeType === 'image/png') {
		return 'png';
	}

	throw new AppError('Unsupported document format', 400);
};

const buildObjectUrl = (bucket: string, key: string): string => {
	return `https://${bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
};

const assertS3Configured = (): void => {
	if (!env.awsS3Bucket) {
		throw new AppError('AWS_S3_BUCKET is not configured', 500);
	}
};

export interface UploadedProfilePhoto {
	objectKey: string;
	objectUrl: string;
}

export const uploadProfilePhotoToS3 = async (params: {
	userId: string;
	buffer: Buffer;
	mimeType: string;
}): Promise<UploadedProfilePhoto> => {
	assertS3Configured();

	const extension = getExtensionFromMimeType(params.mimeType);
	const uniqueName = `${Date.now()}-${randomUUID()}.${extension}`;
	const objectKey = `users/${params.userId}/profile/${uniqueName}`;

	await s3Client.send(
		new PutObjectCommand({
			Bucket: env.awsS3Bucket,
			Key: objectKey,
			Body: params.buffer,
			ContentType: params.mimeType,
		}),
	);

	return {
		objectKey,
		objectUrl: buildObjectUrl(env.awsS3Bucket, objectKey),
	};
};

export const deleteFileFromS3 = async (objectKey: string): Promise<void> => {
	assertS3Configured();

	await s3Client.send(
		new DeleteObjectCommand({
			Bucket: env.awsS3Bucket,
			Key: objectKey,
		}),
	);
};

export const getSignedProfilePhotoUrl = async (objectKey: string): Promise<string> => {
	assertS3Configured();

	return getSignedUrl(
		s3Client,
		new GetObjectCommand({
			Bucket: env.awsS3Bucket,
			Key: objectKey,
		}),
		{ expiresIn: env.profilePhotoSignedUrlTtlSeconds },
	);
};

export interface UploadedTherapistDocument {
	objectKey: string;
	objectUrl: string;
}

export interface UploadedSessionAudio {
	objectKey: string;
	objectUrl: string;
}

export const uploadTherapistDocumentToS3 = async (params: {
	therapistUserId: string;
	documentType: 'license' | 'degree' | 'certificate';
	buffer: Buffer;
	mimeType: string;
}): Promise<UploadedTherapistDocument> => {
	assertS3Configured();

	const extension = getDocumentExtensionFromMimeType(params.mimeType);
	const uniqueName = `${Date.now()}-${randomUUID()}.${extension}`;
	const objectKey = `therapists/${params.therapistUserId}/documents/${params.documentType}/${uniqueName}`;

	await s3Client.send(
		new PutObjectCommand({
			Bucket: env.awsS3Bucket,
			Key: objectKey,
			Body: params.buffer,
			ContentType: params.mimeType,
			ServerSideEncryption: 'AES256',
		}),
	);

	return {
		objectKey,
		objectUrl: buildObjectUrl(env.awsS3Bucket, objectKey),
	};
};

export const getSignedTherapistDocumentUrl = async (objectKey: string): Promise<string> => {
	assertS3Configured();

	return getSignedUrl(
		s3Client,
		new GetObjectCommand({
			Bucket: env.awsS3Bucket,
			Key: objectKey,
		}),
		{ expiresIn: env.therapistDocumentSignedUrlTtlSeconds },
	);
};

export const getSignedS3ObjectUrl = async (objectKey: string, expiresInSeconds = env.exportSignedUrlTtlSeconds): Promise<string> => {
	assertS3Configured();

	return getSignedUrl(
		s3Client,
		new GetObjectCommand({
			Bucket: env.awsS3Bucket,
			Key: objectKey,
		}),
		{ expiresIn: expiresInSeconds },
	);
};

export const uploadSessionAudioToS3 = async (params: {
	sessionId: string;
	buffer: Buffer;
	mimeType: string;
	fileExtension?: string;
}): Promise<UploadedSessionAudio> => {
	assertS3Configured();

	const safeExtension = String(params.fileExtension || 'wav').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'wav';
	const uniqueName = `${Date.now()}-${randomUUID()}.${safeExtension}`;
	const objectKey = `sessions/${params.sessionId}/audio/${uniqueName}`;

	await s3Client.send(
		new PutObjectCommand({
			Bucket: env.awsS3Bucket,
			Key: objectKey,
			Body: params.buffer,
			ContentType: params.mimeType,
			ServerSideEncryption: 'AES256',
		}),
	);

	return {
		objectKey,
		objectUrl: buildObjectUrl(env.awsS3Bucket, objectKey),
	};
};

