import React, { useState, useRef, useEffect } from "react";
import "../css/homepage.css";
import HomepageOptions from "../pages/Homepage/HomepageOptions";
import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useSharedProps } from "../contexts/SharedPropsContext";
import TrashOptions from "../pages/Trash/TrashOptions";

function ProjectOptionsHome({
  id,
  name,
  onOpen = () => {},
  managers = "",
  createdAt = "",
  modifiedAt = "",
  deletedAt = "",
  optionsState = {},
  project = {},
  setOptionsState = () => {},
  isTrash = false,
}) {
  const {
    designs,
    userDesigns,
    designVersions,
    userDesignVersions,
    deletedDesigns,
    userDeletedDesigns,
  } = useSharedProps();
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
    console.log(project.id);
  }, [clickedId]);

  const getDesignImage = (designId) => {
    if (!designId) {
      console.log("No design ID provided");
      return "";
    }

    // Get the design
    const fetchedDesign =
      userDesigns.find((design) => design.id === designId) ||
      designs.find((design) => design.id === designId);
    if (!fetchedDesign || !fetchedDesign.history || fetchedDesign.history.length === 0) {
      return "";
    }

    // Get the latest designVersionId
    const latestDesignVersionId = fetchedDesign.history[fetchedDesign.history.length - 1];
    if (!latestDesignVersionId) {
      return "";
    }
    const fetchedLatestDesignVersion =
      userDesignVersions.find((designVer) => designVer.id === latestDesignVersionId) ||
      designVersions.find((designVer) => designVer.id === latestDesignVersionId);
    if (!fetchedLatestDesignVersion?.images?.length) {
      return "";
    }

    // Return the first image's link from the fetched design version
    return fetchedLatestDesignVersion.images[0].link || "";
  };

  const getLatestDesignImage = (projectId) => {
    console.log("getLatestDesignImage called with projectId:", projectId); // Debug log
    const designsForProject = userDesigns.filter((design) => design.projectId === projectId);
    if (designsForProject.length === 0) {
      console.log("No designs found for project:", projectId); // Debug log
      return "";
    }

    const latestDesign = designsForProject.sort(
      (a, b) => b.modifiedAt.toMillis() - a.modifiedAt.toMillis()
    )[0];
    if (!latestDesign) {
      console.log("No latest design found for project:", projectId); // Debug log
      return "";
    }

    const latestDesignVersionId = latestDesign.history[latestDesign.history.length - 1];
    const fetchedLatestDesignVersion =
      userDesignVersions.find((designVer) => designVer.id === latestDesignVersionId) ||
      designVersions.find((designVer) => designVer.id === latestDesignVersionId);

    if (!fetchedLatestDesignVersion?.images?.length) {
      console.log("No images found for latest design version:", latestDesignVersionId); // Debug log
      return "";
    }

    const imageUrl = fetchedLatestDesignVersion.images[0].link || "";
    console.log("Image URL found:", imageUrl); // Debug log
    return imageUrl;
  };

  const getTrashLatestDesignImage = (projectId) => {
    console.log("getTrashLatestDesignImage called with projectId:", projectId); // Debug log
    const designsForProject =
      userDeletedDesigns.filter((design) => design.projectId === projectId) ||
      deletedDesigns.filter((design) => design.projectId === projectId);
    if (designsForProject.length === 0) {
      console.log("No deleted designs found for project:", projectId); // Debug log
      return "";
    }

    const latestDesign = designsForProject.sort(
      (a, b) => b?.deletedAt.toMillis() - a?.deletedAt.toMillis()
    )[0];
    if (!latestDesign) {
      console.log("No latest deleted design found for project:", projectId); // Debug log
      return "";
    }

    const latestDesignVersionId = latestDesign.history[latestDesign.history.length - 1];
    const fetchedLatestDesignVersion = designVersions.find(
      (designVer) => designVer.id === latestDesignVersionId
    );

    if (!fetchedLatestDesignVersion?.images?.length) {
      console.log("No images found for latest deleted design version:", latestDesignVersionId); // Debug log
      return "";
    }

    const imageUrl = fetchedLatestDesignVersion.images[0].link || "";
    console.log("Image URL found:", imageUrl); // Debug log
    return imageUrl;
  };

  return (
    <div className="iconFrame">
      {!isTrash ? (
        <HomepageOptions
          isDesign={false}
          id={id}
          onOpen={onOpen}
          optionsState={optionsState}
          setOptionsState={setOptionsState}
          clickedId={clickedId}
          setClickedId={setClickedId}
          toggleOptions={toggleOptions}
          object={project}
        />
      ) : (
        <TrashOptions
          isDesign={false}
          id={id}
          object={project}
          isTable={false}
          optionsState={optionsState}
          setOptionsState={setOptionsState}
          clickedId={clickedId}
          setClickedId={setClickedId}
          toggleOptions={toggleOptions}
        />
      )}
      {/* Project image */}
      <div
        className="homepage-thumbnail"
        style={{ cursor: !isTrash ? "pointer" : "default" }}
        onClick={onOpen}
      >
        <img
          src={!isTrash ? getLatestDesignImage(project.id) : getTrashLatestDesignImage(project.id)}
          className="pic"
          alt=""
          style={{
            objectFit: "cover",
            objectPosition: "center",
            cursor: !isTrash ? "pointer" : "default",
          }}
        />
      </div>

      {/* Project title */}
      <div style={{ textAlign: "start", padding: "0px 3px", width: "100%" }}>
        <h3
          className="titleDesign"
          style={{ cursor: !isTrash ? "pointer" : "default" }}
          onClick={onOpen}
        >
          {name}
        </h3>
        <span className="dateModified">
          {!isTrash ? `Modified ${modifiedAt}` : `Deleted ${deletedAt}`}
        </span>
      </div>
    </div>
  );
}

export default ProjectOptionsHome;
