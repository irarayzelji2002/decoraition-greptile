import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Paper, IconButton, InputBase, Button } from "@mui/material";
import {
  Search as SearchIcon,
  CloseRounded as CloseRoundedIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
} from "@mui/icons-material";
import { AddIcon } from "../../components/svg/DefaultMenuIcons";
import { showToast } from "../../functions/utils";
import { auth, db } from "../../firebase";
import ProjectHead from "./ProjectHead";
import Modal from "../../components/Modal";
import BottomBarDesign from "./BottomBarProject";
import Loading from "../../components/Loading";
import DesignIcon from "../../components/DesignIcon";
import Dropdowns from "../../components/Dropdowns";
import "../../css/seeAll.css";
import "../../css/project.css";
import { fetchProjectDesigns } from "./backend/ProjectDetails";
import { AddDesign, AddProject } from "../DesignSpace/svg/AddImage";
import { HorizontalIcon, TiledIcon, VerticalIcon } from "./svg/ExportIcon";
import { Typography } from "@mui/material";
import { ListIcon } from "./svg/ExportIcon";
import { useSharedProps } from "../../contexts/SharedPropsContext";
import LoadingPage from "../../components/LoadingPage";
import { iconButtonStyles } from "../Homepage/DrawerComponent";
import { formatDateLong, getUsername } from "../Homepage/backend/HomepageActions";
import axios from "axios";
import HomepageTable from "../Homepage/HomepageTable";
import { usePreventNavigation } from "../../hooks/usePreventNavigation";

function Project() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const { projectId } = useParams();
  const [newName, setNewName] = useState("");
  const [userId, setUserId] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, userDesign } = useSharedProps();
  const [isVertical, setIsVertical] = useState(false);
  const navigate = useNavigate();
  const [optionsState, setOptionsState] = useState({
    showOptions: false,
    selectedId: null,
  });
  const [filteredDesignsForTable, setFilteredDesignsForTable] = useState([]);
  const [loadingDesigns, setLoadingDesigns] = useState(true);
  const [sortBy, setSortBy] = useState("none");
  const [order, setOrder] = useState("none");
  const [isDesignButtonDisabled, setIsDesignButtonDisabled] = useState(false);
  const [numToShowMoreDesign, setNumToShowMoreDesign] = useState(0);
  const [thresholdDesign, setThresholdDesign] = useState(6);
  const [loadingImage, setLoadingImage] = useState(true);

  const handleVerticalClick = () => {
    setIsVertical(true);
  };
  const handleHorizontalClick = () => {
    setIsVertical(false);
  };
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleSortByChange = (value) => {
    setSortBy(value);
    sortDesigns(value, order);
  };

  const handleOrderChange = (value) => {
    setOrder(value);
    sortDesigns(sortBy, value);
  };

  const sortDesigns = (sortBy, order) => {
    const sortedDesigns = [...designs].sort((a, b) => {
      let comparison = 0;
      if (sortBy && sortBy !== "none" && order && order !== "none") {
        if (sortBy === "name") {
          comparison = a.designName.localeCompare(b.designName);
        } else if (sortBy === "owner") {
          comparison = a.owner.localeCompare(b.owner);
        } else if (sortBy === "created") {
          comparison = a.createdAtTimestamp - b.createdAtTimestamp;
        } else if (sortBy === "modified") {
          comparison = a.modifiedAtTimestamp - b.modifiedAtTimestamp;
        }
        return order === "ascending" ? comparison : -comparison;
      }
      return [...designs];
    });
    setFilteredDesignsForTable(sortedDesigns);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          console.log(`Fetching designs for projectId: ${projectId}`); // Debug log
          await fetchProjectDesigns(projectId, setDesigns);
          setLoadingImage(false); // Set loading to false after fetching
        } catch (error) {
          showToast("error", `Error fetching project designs: ${error.message}`);
          setLoadingDesigns(false); // Set loading to false on error
          setLoadingImage(false); // Set loading to false on error
        }
      }
    };

    fetchData();
  }, [user, projectId, userDesign]);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);

        const fetchProjectDetails = async () => {
          try {
            const projectRef = doc(db, "projects", projectId);
            const projectSnapshot = await getDoc(projectRef);
            if (projectSnapshot.exists()) {
              const project = projectSnapshot.data();
              setProjectData(project);
              setNewName(project.name);

              // Listen for real-time updates to the project document
              const unsubscribeProject = onSnapshot(projectRef, (doc) => {
                if (doc.exists()) {
                  const updatedProject = doc.data();
                  setProjectData(updatedProject);
                  setNewName(updatedProject.name);
                }
              });

              // Cleanup listener on component unmount
              return () => unsubscribeProject();
            } else {
              console.error("Project not found");
            }
          } catch (error) {
            console.error("Error fetching project details:", error);
          }
        };

        fetchProjectDetails();
      } else {
        console.error("User is not authenticated");
      }
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [projectId]);

  const loadProjectDataForView = async () => {
    setLoadingDesigns(true);
    if (designs.length > 0) {
      const designsByLatest = [...designs].sort((a, b) => {
        const modifiedAtA = a.modifiedAt.toDate ? a.modifiedAt.toDate() : new Date(a.modifiedAt);
        const modifiedAtB = b.modifiedAt.toDate ? b.modifiedAt.toDate() : new Date(b.modifiedAt);
        return modifiedAtB - modifiedAtA; // Modified latest first
      });
      setLoadingDesigns(false);
      const tableData = await Promise.all(
        designsByLatest.map(async (design) => {
          const username = await getUsername(design.owner);
          console.log("Design createdAt:", design.createdAt); // Debug log
          console.log("Design modifiedAt:", design.modifiedAt); // Debug log
          const createdAtTimestamp =
            design.createdAt && design.createdAt.toMillis
              ? design.createdAt.toMillis()
              : new Date(design.createdAt).getTime();
          const modifiedAtTimestamp =
            design.modifiedAt && design.modifiedAt.toMillis
              ? design.modifiedAt.toMillis()
              : new Date(design.modifiedAt).getTime();
          return {
            ...design,
            ownerId: design.owner,
            owner: username,
            formattedCreatedAt: formatDateLong(design.createdAt),
            createdAtTimestamp,
            formattedModifiedAt: formatDateLong(design.modifiedAt),
            modifiedAtTimestamp,
          };
        })
      );
      setFilteredDesignsForTable(tableData);
    } else {
      setFilteredDesignsForTable([]);
      setLoadingDesigns(false); // Set loading to false if no designs
    }
  };

  useEffect(() => {
    loadProjectDataForView();
  }, [designs]);

  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };

  const handleCreateDesign = async (projectId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await axios.post(
        `/api/project/${projectId}/create-design`,
        {
          userId: auth.currentUser.uid,
          designName: "Untitled Design",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200) {
        showToast("success", "Design created successfully");
        await fetchProjectDesigns(projectId, setDesigns); // Refresh designs list
      }
    } catch (error) {
      console.error("Error creating design:", error);
      showToast("error", "Error creating design! Please try again.");
    }
  };

  const handleCreateDesignWithLoading = async (projectId) => {
    setIsDesignButtonDisabled(true);
    await handleCreateDesign(projectId);
    setIsDesignButtonDisabled(false);
  };

  if (loadingImage) {
    return <LoadingPage />;
  }

  if (!projectData) {
    return <LoadingPage />;
  }
  return (
    <>
      <ProjectHead project={projectData} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        {menuOpen && <div className="overlay" onClick={toggleMenu}></div>}
        <Paper
          component="form"
          sx={{
            p: "2px 4px",
            display: "flex",
            alignItems: "center",
            width: "90%",
            marginTop: "40px",
            backgroundColor: "var(--bgMain)",
            border: "2px solid var(--borderInput)",
            borderRadius: "20px",
            "&:focus-within": {
              borderColor: "var(--brightFont)",
            },
          }}
        >
          <IconButton
            type="button"
            sx={{ p: "10px", color: "var(--color-white)" }}
            aria-label="search"
          >
            <SearchIcon sx={{ color: "var(--color-white)" }} />
          </IconButton>
          <InputBase
            sx={{ ml: 1, flex: 1, color: "var(--color-white)" }}
            placeholder="Search designs on this project"
            inputProps={{ "aria-label": "search google maps" }}
          />
        </Paper>
        {!isVertical && (
          <div className="dropdown-container">
            <Dropdowns
              sortBy={sortBy}
              order={order}
              onSortByChange={handleSortByChange}
              onOrderChange={handleOrderChange}
              isDesign={true}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexDirection: "row",
          }}
        >
          <main
            className="content"
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexDirection: "row",
              overflow: "hidden",
            }}
          ></main>
        </div>
      </div>
      <div
        style={{
          paddingBottom: "20%",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "90%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          <div style={{ width: "90%" }}>
            <div style={{ display: "flex" }}>
              <span
                className="SubtitlePrice"
                style={{
                  backgroundColor: "transparent",
                }}
              >
                Designs
              </span>
              <div className="button-container" style={{ display: "flex", marginLeft: "auto" }}>
                <IconButton
                  style={{ marginRight: "10px" }}
                  onClick={handleHorizontalClick}
                  sx={{
                    ...iconButtonStyles,
                    padding: "10px",
                    marginRight: "10px",
                    borderRadius: "8px",
                    backgroundColor: !isVertical ? "var(--nav-card-modal)" : "transparent",
                  }}
                >
                  <TiledIcon />
                </IconButton>
                <IconButton
                  sx={{
                    ...iconButtonStyles,
                    padding: "10px",
                    marginRight: "10px",
                    borderRadius: "8px",
                    backgroundColor: isVertical ? "var(--nav-card-modal)" : "transparent",
                  }}
                  onClick={handleVerticalClick}
                >
                  <ListIcon />
                </IconButton>
              </div>
            </div>
          </div>

          <div
            className={`layout ${isVertical ? "vertical" : ""}`}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            {loadingDesigns ? (
              <Loading />
            ) : isVertical ? (
              designs.length > 0 && (
                <HomepageTable
                  isDesign={true}
                  data={filteredDesignsForTable}
                  isHomepage={false}
                  optionsState={optionsState}
                  setOptionsState={setOptionsState}
                />
              )
            ) : (
              designs.length > 0 &&
              designs.slice(0, 6 + numToShowMoreDesign).map((design) => (
                <DesignIcon
                  key={design.id}
                  id={design.id}
                  name={design.designName}
                  design={design}
                  onOpen={() =>
                    navigate(`/design/${design.id}`, {
                      state: { designId: design.id },
                    })
                  }
                  owner={getUsername(design.owner)}
                  projectType={true}
                  createdAt={formatDateLong(design.createdAt)}
                  modifiedAt={formatDateLong(design.modifiedAt)}
                  optionsState={optionsState}
                  setOptionsState={setOptionsState}
                />
              ))
            )}
          </div>
        </div>
        <div
          className="center-me"
          style={{ display: "inline-flex", marginTop: "20px", position: "relative" }}
        >
          {designs.length > thresholdDesign && numToShowMoreDesign < designs.length && (
            <Button
              variant="contained"
              onClick={() => setNumToShowMoreDesign(numToShowMoreDesign + thresholdDesign)}
              className="cancel-button"
              sx={{
                width: "200px",
              }}
            >
              Show more
            </Button>
          )}
        </div>
        {filteredDesignsForTable.length === 0 && (
          <div className="no-content">
            <img src="/img/design-placeholder.png" alt="No designs yet" />
            <p>No designs yet. Start creating.</p>
          </div>
        )}
      </div>

      <div className="circle-button-container">
        {menuOpen && (
          <div className="small-buttons">
            <div
              className="small-button-container"
              onClick={() => !isDesignButtonDisabled && handleCreateDesignWithLoading(projectId)}
              style={{
                opacity: isDesignButtonDisabled ? "0.5" : "1",
                cursor: isDesignButtonDisabled ? "default" : "pointer",
              }}
            >
              <span className="small-button-text">Import a Design</span>
              <div className="small-circle-button">
                <AddDesign />
              </div>
            </div>
            <div
              className="small-button-container"
              onClick={() => !isDesignButtonDisabled && handleCreateDesignWithLoading(projectId)}
              style={{
                opacity: isDesignButtonDisabled ? "0.5" : "1",
                cursor: isDesignButtonDisabled ? "default" : "pointer",
              }}
            >
              <span className="small-button-text">Create a Design</span>
              <div className="small-circle-button">
                <AddProject />
              </div>
            </div>
          </div>
        )}
        <div className={`circle-button ${menuOpen ? "rotate" : ""} add`} onClick={toggleMenu}>
          {menuOpen ? <AddIcon /> : <AddIcon />}
        </div>
      </div>

      {modalOpen && <Modal onClose={closeModal} />}

      <BottomBarDesign Design={true} projId={projectId} />
    </>
  );
}

export default Project;
