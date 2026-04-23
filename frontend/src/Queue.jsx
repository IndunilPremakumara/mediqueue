import { useEffect, useState } from "react";
import socket from "./services/socket";

function Queue() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    socket.emit("joinQueue", { doctor_id: 1 });

    socket.on("queueUpdated", (data) => {
      console.log(data);
      setMessage(data.message || "Queue updated");
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div>
      <h2>Live Queue Updates</h2>
      <p>{message}</p>
    </div>
  );
}

export default Queue;