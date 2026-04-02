"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePublicSignupRole = exports.validateOtp = exports.validatePassword = exports.validatePhone = exports.validateEmail = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[1-9]\d{9,14}$/;
const assertString = (value, field) => {
    if (typeof value !== 'string' || !value.trim()) {
        throw new error_middleware_1.AppError(`${field} is required`, 400);
    }
    return value.trim();
};
const validateEmail = (value) => {
    const email = assertString(value, 'email').toLowerCase();
    if (!emailRegex.test(email)) {
        throw new error_middleware_1.AppError('Invalid email format', 400);
    }
    return email;
};
exports.validateEmail = validateEmail;
const validatePhone = (value) => {
    const rawPhone = assertString(value, 'phone');
    const compactPhone = rawPhone.replace(/[\s()-]/g, '');
    let phone = compactPhone;
    if (/^\d{10}$/.test(phone)) {
        phone = `+91${phone}`;
    }
    else if (/^91\d{10}$/.test(phone)) {
        phone = `+${phone}`;
    }
    if (!phoneRegex.test(phone)) {
        throw new error_middleware_1.AppError('Invalid phone format', 400);
    }
    return phone;
};
exports.validatePhone = validatePhone;
const validatePassword = (value) => {
    const password = assertString(value, 'password');
    if (password.length < 8) {
        throw new error_middleware_1.AppError('Password must be at least 8 characters', 400);
    }
    return password;
};
exports.validatePassword = validatePassword;
const validateOtp = (value) => {
    const otp = assertString(value, 'otp');
    if (!/^\d{6}$/.test(otp)) {
        throw new error_middleware_1.AppError('OTP must be 6 digits', 400);
    }
    return otp;
};
exports.validateOtp = validateOtp;
const validatePublicSignupRole = (value) => {
    const role = assertString(value, 'role').toLowerCase();
    if (role === 'patient' || role === 'therapist' || role === 'psychiatrist' || role === 'psychologist' || role === 'coach') {
        return role;
    }
    throw new error_middleware_1.AppError('Invalid role. Allowed roles: patient, therapist, psychiatrist, psychologist, coach', 400);
};
exports.validatePublicSignupRole = validatePublicSignupRole;
