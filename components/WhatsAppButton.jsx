export default function WhatsAppButton({ number, message }) {
  if (!number) return null;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message || "Hello, I need help with clearance")}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <button 
        className="btn w-100 mt-2 fw-bold text-white shadow-sm"
        style={{ background: "#25D366", borderRadius: "10px" }}
      >
        💬 Contact on WhatsApp
      </button>
    </a>
  );
}
