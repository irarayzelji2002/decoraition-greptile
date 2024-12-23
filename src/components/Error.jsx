import React from "react";
import "../css/error.css";
function Error() {
  return (
    <div className="error-container">
      <h1 className="error-title">404</h1>
      <p className="error-message">Uh oh, seems like the page you're looking for is not found.</p>
      <a href="/" className="back-home">
        Back To Homepage
      </a>
    </div>
  );
}
export default Error;
