"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSessionAudioToS3 = exports.getSignedS3ObjectUrl = exports.getSignedTherapistDocumentUrl = exports.uploadTherapistDocumentToS3 = exports.getSignedProfilePhotoUrl = exports.deleteFileFromS3 = exports.uploadProfilePhotoToS3 = exports.s3Client = void 0;
const crypto_1 = require("crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const env_1 = require("../config/env");
const error_middleware_1 = require("../middleware/error.middleware");
const clientConfig = {
    region: env_1.env.awsRegion,
    ...(env_1.env.awsAccessKeyId && env_1.env.awsSecretAccessKey
        ? {
            credentials: {
                accessKeyId: env_1.env.awsAccessKeyId,
                secretAccessKey: env_1.env.awsSecretAccessKey,
            },
        }
        : {}),
};
exports.s3Client = new client_s3_1.S3Client(clientConfig);
const getExtensionFromMimeType = (mimeType) => {
    if (mimeType === 'image/jpeg') {
        return 'jpg';
    }
    if (mimeType === 'image/png') {
        return 'png';
    }
    throw new error_middleware_1.AppError('Unsupported file format', 400);
};
const getDocumentExtensionFromMimeType = (mimeType) => {
    if (mimeType === 'application/pdf') {
        return 'pdf';
    }
    if (mimeType === 'image/jpeg') {
        return 'jpg';
    }
    if (mimeType === 'image/png') {
        return 'png';
    }
    throw new error_middleware_1.AppError('Unsupported document format', 400);
};
const buildObjectUrl = (bucket, key) => {
    return `https://${bucket}.s3.${env_1.env.awsRegion}.amazonaws.com/${key}`;
};
const assertS3Configured = () => {
    if (!env_1.env.awsS3Bucket) {
        throw new error_middleware_1.AppError('AWS_S3_BUCKET is not configured', 500);
    }
};
const uploadProfilePhotoToS3 = async (params) => {
    assertS3Configured();
    const extension = getExtensionFromMimeType(params.mimeType);
    const uniqueName = `${Date.now()}-${(0, crypto_1.randomUUID)()}.${extension}`;
    const objectKey = `users/${params.userId}/profile/${uniqueName}`;
    await exports.s3Client.send(new client_s3_1.PutObjectCommand({
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
        Body: params.buffer,
        ContentType: params.mimeType,
    }));
    return {
        objectKey,
        objectUrl: buildObjectUrl(env_1.env.awsS3Bucket, objectKey),
    };
};
exports.uploadProfilePhotoToS3 = uploadProfilePhotoToS3;
const deleteFileFromS3 = async (objectKey) => {
    assertS3Configured();
    await exports.s3Client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
    }));
};
exports.deleteFileFromS3 = deleteFileFromS3;
const getSignedProfilePhotoUrl = async (objectKey) => {
    assertS3Configured();
    return (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, new client_s3_1.GetObjectCommand({
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
    }), { expiresIn: env_1.env.profilePhotoSignedUrlTtlSeconds });
};
exports.getSignedProfilePhotoUrl = getSignedProfilePhotoUrl;
const uploadTherapistDocumentToS3 = async (params) => {
    assertS3Configured();
    const extension = getDocumentExtensionFromMimeType(params.mimeType);
    const uniqueName = `${Date.now()}-${(0, crypto_1.randomUUID)()}.${extension}`;
    const objectKey = `therapists/${params.therapistUserId}/documents/${params.documentType}/${uniqueName}`;
    await exports.s3Client.send(new client_s3_1.PutObjectCommand({
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
        Body: params.buffer,
        ContentType: params.mimeType,
        ServerSideEncryption: 'AES256',
    }));
    return {
        objectKey,
        objectUrl: buildObjectUrl(env_1.env.awsS3Bucket, objectKey),
    };
};
exports.uploadTherapistDocumentToS3 = uploadTherapistDocumentToS3;
const getSignedTherapistDocumentUrl = async (objectKey) => {
    assertS3Configured();
    return (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, new client_s3_1.GetObjectCommand({
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
    }), { expiresIn: env_1.env.therapistDocumentSignedUrlTtlSeconds });
};
exports.getSignedTherapistDocumentUrl = getSignedTherapistDocumentUrl;
const getSignedS3ObjectUrl = async (objectKey, expiresInSeconds = env_1.env.exportSignedUrlTtlSeconds) => {
    assertS3Configured();
    return (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, new client_s3_1.GetObjectCommand({
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
    }), { expiresIn: expiresInSeconds });
};
exports.getSignedS3ObjectUrl = getSignedS3ObjectUrl;
const uploadSessionAudioToS3 = async (params) => {
    assertS3Configured();
    const safeExtension = String(params.fileExtension || 'wav').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'wav';
    const uniqueName = `${Date.now()}-${(0, crypto_1.randomUUID)()}.${safeExtension}`;
    const objectKey = `sessions/${params.sessionId}/audio/${uniqueName}`;
    await exports.s3Client.send(new client_s3_1.PutObjectCommand({
        Bucket: env_1.env.awsS3Bucket,
        Key: objectKey,
        Body: params.buffer,
        ContentType: params.mimeType,
        ServerSideEncryption: 'AES256',
    }));
    return {
        objectKey,
        objectUrl: buildObjectUrl(env_1.env.awsS3Bucket, objectKey),
    };
};
exports.uploadSessionAudioToS3 = uploadSessionAudioToS3;
