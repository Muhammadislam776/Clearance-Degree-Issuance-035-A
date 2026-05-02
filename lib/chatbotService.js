/**
 * Chatbot Service - Handles logic for the AI Clearance Assistant
 */

const CLEARANCE_FAQS = [
  {
    keywords: ["how long", "duration", "time", "how many days", "when"],
    answer: "The clearance process typically takes 3-7 working days, depending on how quickly each department reviews your records. You can track real-time progress on your dashboard!"
  },
  {
    keywords: ["document", "upload", "attach", "files", "transcript", "voucher", "receipt"],
    answer: "You usually need to upload your final Transcript, Library Clearance Slip, and Fee No-Dues Certificate. Ensure all files are in PDF or JPG format and under 5MB. Check the 'Documents' section in your request for specific departmental requirements."
  },
  {
    keywords: ["reject", "rejected", "rejected reason", "fix", "deny", "denied"],
    answer: "If a department rejects your request, they will provide specific 'Remarks' on your dashboard. You should address those notes (e.g., pay a pending fine or return a book) and then the department will re-evaluate your application automatically."
  },
  {
    keywords: ["whatsapp", "contact", "call", "staff", "talk", "message", "focal person"],
    answer: "You can find direct WhatsApp links and email addresses for each department's focal person right here in the Chat section. Just select a department from the left sidebar to see their contact info and reach out directly!"
  },
  {
    keywords: ["degree", "certificate", "when receive", "issuance", "graduate", "graduation"],
    answer: "Once all departmental clearances reach 100% 'Approved' status, the Academic Examiner will perform a final review. After their approval, your degree issuance process begins. You will be notified via email when your degree is ready for pickup or dispatch."
  },
  {
    keywords: ["fee", "dues", "fine", "money", "pay", "payment", "challan"],
    answer: "All fee-related queries are handled by the Finance department. If you have pending dues, please generate a challan from your student portal, pay it at the designated bank, and upload the scanned receipt to your clearance application."
  },
  {
    keywords: ["library", "book", "return", "borrowed"],
    answer: "The Library department requires all borrowed books to be returned before they can approve your clearance. If you have lost a book, you may need to pay a replacement fine. Please contact the Library focal person for exact details."
  },
  {
    keywords: ["start", "apply", "begin", "initiate", "how to"],
    answer: "To start your clearance, go to the 'Clearance' tab on your dashboard and click 'Apply for Clearance'. Fill out the required details, upload your initial documents, and submit. The system will automatically route your request to all relevant departments."
  },
  {
    keywords: ["error", "bug", "stuck", "portal not working", "issue"],
    answer: "If you are facing technical issues with the portal, try clearing your browser cache or logging out and back in. If the issue persists, please contact the IT Helpdesk via the 'Computer Science' or 'IT' department chat."
  },
  {
    keywords: ["hello", "hi", "hey", "greetings"],
    answer: "Hello! I am your AI Clearance Assistant. I'm here to help you navigate the graduation and clearance process. What do you need help with?"
  },
  {
    keywords: ["thank", "thanks", "helpful", "good"],
    answer: "You're very welcome! If you have any more questions about your clearance or degree issuance, I'm always here to help. Good luck with your graduation!"
  }
];

// Helper to count keyword matches
const countMatches = (message, keywords) => {
  let count = 0;
  const words = message.toLowerCase().split(/\\W+/);
  for (const keyword of keywords) {
    // Check if the exact phrase or word exists in the message
    if (message.toLowerCase().includes(keyword.toLowerCase())) {
      count += 2; // Exact phrase match carries more weight
    } else {
      // Check individual words
      const kwWords = keyword.toLowerCase().split(/\\W+/);
      for (const kw of kwWords) {
        if (words.includes(kw)) count++;
      }
    }
  }
  return count;
};

// Helper to fetch general knowledge from Wikipedia
const fetchGeneralKnowledge = async (query) => {
  try {
    // Extract a potential subject by removing common words
    const stopwords = ["what", "is", "who", "where", "why", "how", "tell", "me", "about", "the", "a", "an", "of", "and"];
    let searchTerms = query.toLowerCase().split(/\\W+/).filter(w => !stopwords.includes(w) && w.length > 2);
    
    if (searchTerms.length === 0) return null;
    
    const searchTerm = searchTerms.join(" ");
    
    // Use Wikipedia REST API
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.type === 'standard' && data.extract) {
        return `Here is what I found about that: ${data.extract} (Source: Wikipedia). If you have any questions about clearance or your degree, feel free to ask!`;
      }
    }
  } catch (error) {
    console.error("Wikipedia search failed:", error);
  }
  return null;
};

export const getBotResponse = async (userMessage) => {
  // Simulate network delay for "thinking" feel
  await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 600));

  let bestMatch = null;
  let maxScore = 0;

  for (const faq of CLEARANCE_FAQS) {
    const score = countMatches(userMessage, faq.keywords);
    if (score > maxScore) {
      maxScore = score;
      bestMatch = faq;
    }
  }

  // If we found a decent match, return it
  if (bestMatch && maxScore > 1) { // Require at least a strong match
    return bestMatch.answer;
  }

  // If no internal match, try fetching general knowledge (out-of-project queries)
  const generalAnswer = await fetchGeneralKnowledge(userMessage);
  if (generalAnswer) {
    return generalAnswer;
  }

  // Ultimate fallback
  return "I understand you're asking a question, but I couldn't find an exact match in my academic database or general knowledge. Could you clarify if your question is about documents, fees, library dues, contacting a department, or tracking your application timeline?";
};

export default { getBotResponse };
