import React, { useState, useRef, useEffect } from "react";
import "../css/homepage.css";
import HomepageOptions from "../pages/Homepage/HomepageOptions";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";

function ProjectOptionsHome({
  id,
  name,
  onOpen,
  managers = "",
  createdAt = "",
  modifiedAt = "",
  optionsState = {},
  setOptionsState = () => {},
}) {
  const [clickedId, setClickedId] = useState("");

  const toggleOptions = (id) => {
    setOptionsState((prev) => {
      if (prev.selectedId === id) {
        // If the same ID is clicked, close the options menu
        return { showOptions: false, selectedId: null };
      } else {
        // Open options for the new ID
        return { showOptions: true, selectedId: id };
      }
    });
  };

  useEffect(() => {
    toggleOptions(clickedId);
  }, [clickedId]);

  return (
    <div className="iconFrame">
      <HomepageOptions
        isDesign={false}
        id={id}
        onOpen={onOpen}
        optionsState={optionsState}
        setOptionsState={setOptionsState}
        clickedId={clickedId}
        setClickedId={setClickedId}
        toggleOptions={toggleOptions}
      />
      {/* Design image */}
      <img
        src={"/img/Room1.png"}
        className="pic"
        alt="Design"
        onClick={onOpen}
        style={{ objectFit: "cover", objectPosition: "top left" }}
      />

      {/* Design title */}
      <div width="100%" style={{ textAlign: "start" }}>
        <h3 className="titleDesign">{name}</h3>
        <span className="dateModified">{`Modified ${modifiedAt}`}</span>
      </div>
    </div>
  );
}

export default ProjectOptionsHome;
