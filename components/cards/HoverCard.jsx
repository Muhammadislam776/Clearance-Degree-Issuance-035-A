"use client";

import React from "react";
import { Card } from "react-bootstrap";

export default function HoverCard({ children, className = "", style = {}, onClick }) {
	return (
		<Card
			className={className}
			onClick={onClick}
			style={{
				borderRadius: "12px",
				boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
				transition: "transform 150ms ease, box-shadow 150ms ease",
				cursor: onClick ? "pointer" : "default",
				...style,
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.transform = "translateY(-2px)";
				e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.10)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.transform = "translateY(0)";
				e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
			}}
		>
			{children}
		</Card>
	);
}

