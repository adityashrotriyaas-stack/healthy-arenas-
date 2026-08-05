import { C } from "../lib/colors";

function StatusBadge({ status }) {
    const colors = {
        pending: C.creamDim,
        confirmed: C.orange,
        preparing: C.amber,
        delivering: C.amber,
        delivered: C.green,
        cancelled: C.red,
    };
    return (
        <span style={{
            fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
            color: colors[status] || C.creamDim,
            background: `${colors[status] || C.creamDim}15`,
            borderRadius: 50, padding: "3px 12px",
        }}>{status}</span>
    );
}

export { StatusBadge };
