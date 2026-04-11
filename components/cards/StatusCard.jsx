"use client";

import React from "react";
import { Card, Badge } from "react-bootstrap";

export default function StatusCard({
	title,
	subtitle,
	status,
	variant = "secondary",
	rightText,
	onClick,
}) {
	return (
		<Card
			onClick={onClick}
			style={{
				cursor: onClick ? "pointer" : "default",
				boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
				borderRadius: "12px",
			}}
		>
			<Card.Body>
				<div className="d-flex justify-content-between align-items-start">
					<div>
						<div className="fw-bold">{title}</div>
						{subtitle ? <div className="text-muted small">{subtitle}</div> : null}
					</div>
					{rightText ? <div className="text-muted small">{rightText}</div> : null}
				</div>

				<div className="mt-3">
					<Badge bg={variant}>{status}</Badge>
				</div>
			</Card.Body>
		</Card>
	);
}

