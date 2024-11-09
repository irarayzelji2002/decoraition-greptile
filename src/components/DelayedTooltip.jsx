import React, { useState } from "react";
import Tooltip from "@mui/material/Tooltip";

function DelayedTooltip({
  title = "",
  children,
  delay = 1000,
  open = false,
  setOpen,
}) {
  // const [open, setOpen] = useState(false);
  let timer;

  const handleTooltipOpen = () => {
    timer = setTimeout(() => {
      setOpen(true);
    }, delay);
  };

  const handleTooltipClose = () => {
    clearTimeout(timer);
    setOpen(false);
  };

  return (
    <Tooltip
      open={open}
      title={title}
      onMouseEnter={handleTooltipOpen}
      onMouseLeave={handleTooltipClose}
      onClick={handleTooltipClose}
    >
      {children}
    </Tooltip>
  );
}
export default DelayedTooltip;
