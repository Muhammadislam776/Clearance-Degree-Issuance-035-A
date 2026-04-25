export async function POST(req) {
  try {
    const { message } = await req.json();

    // Simple AI logic (can connect OpenAI later)
    let reply = "Please contact your department.";

    if (message.toLowerCase().includes("clearance")) {
      reply = "You can apply for clearance from your dashboard by navigating to the Apply Clearance section.";
    } else if (message.toLowerCase().includes("degree")) {
      reply = "Degrees are issued once your clearance hits 100%. Once verified, you can download your official degree PDF from your dashboard.";
    } else if (message.toLowerCase().includes("fee") || message.toLowerCase().includes("dues")) {
      reply = "Fee queries should be directed to the Finance department. Ensure you upload the latest voucher receipt.";
    } else if (message.toLowerCase().includes("hello") || message.toLowerCase().includes("hi")) {
      reply = "Hello there! I'm your AI assistant. How can I help you with your clearance today?";
    }

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ reply: "I'm having trouble understanding right now. Please try again later." }, { status: 500 });
  }
}
