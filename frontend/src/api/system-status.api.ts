export const activateSystem = async (payload?: any, token?: string) => {
  try {
    const res = await fetch("/api/v1/system/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload || {}),
    });

    return await res.json();
  } catch (error) {
    console.error("Activation failed:", error);
    return { success: false };
  }
};
