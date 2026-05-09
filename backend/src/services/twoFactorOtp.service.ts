type TwoFactorResponse = {
  Status?: string;
  Details?: string;
};

const normalizeIndianPhone = (phone: string) => {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);

  return "";
};

export const sendTwoFactorOtp = async (phoneNumber: string, otp: string) => {
  const apiKey = String(process.env.TWO_FACTOR_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("TWO_FACTOR_API_KEY missing");
  }

  const phone = String(phoneNumber).replace(/\D/g, "").replace(/^91/, "");

  // 2Factor template name / sender config ke hisab se
  const templateName = "Registration11";

  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone}/${otp}/${templateName}`;

  const response = await fetch(url);
  const data = await response.json();

  console.log("[2Factor OTP Response]", data);

  if (!response.ok || data.Status !== "Success") {
    throw new Error(JSON.stringify(data));
  }

  return data;
};