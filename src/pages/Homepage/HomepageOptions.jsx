import React, { useState, useRef, useEffect } from "react";
import "../../css/homepage.css";
import { useNavigate, useLocation } from "react-router-dom";
import { showToast } from "../../functions/utils";
import { handleDeleteDesign, handleDeleteProject } from "./backend/HomepageActions";
import { useSharedProps } from "../../contexts/SharedPropsContext";
import {
  handleNameChange as handleNameChangeDesign,
  handleCopyDesign,
  handleAddCollaborators as handleAddCollaboratorsDesign,
  handleAccessChange as handleAccessChangeDesign,
} from "../DesignSpace/backend/DesignActions.jsx";
import {
  handleNameChange as handleNameChangeProject,
  handleAddCollaborators as handleAddCollaboratorsProject,
  handleAccessChange as handleAccessChangeProject,
} from "../ProjectSpace/backend/ProjectDetails.jsx";

import ShareModal from "../../components/ShareModal";
import ManageAccessModal from "../../components/ManageAccessModal.jsx";
import ShareMenu from "../../components/ShareMenu";
import CopyLinkModal from "../../components/CopyLinkModal";
import DownloadModal from "../../components/DownloadModal";
import MakeCopyModal from "../../components/MakeCopyModal";
import RenameModal from "../../components/RenameModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";
import InfoModal from "../../components/InfoModal";

import IconButton from "@mui/material/IconButton";
import MoreVertIcon from "@mui/icons-material/MoreVert";

import {
  CopyLinkIcon,
  ShareIcon,
  SettingsIcon,
  MakeACopyIcon,
  RenameIcon,
  DownloadIcon,
  DeleteIcon,
  DetailsIcon,
} from "../../components/svg/DefaultMenuIcons";

import { OpenInNew as OpenInNewIcon } from "@mui/icons-material";
import deepEqual from "deep-equal";

function HomepageOptions({
  isDesign,
  id,
  object,
  onOpen,
  isTable = false,
  isDrawer = false,
  optionsState = {},
  setOptionsState = () => {},
  clickedId = "",
  setClickedId = () => {},
  toggleOptions = (id) => {
    setOptionsState((prev) => {
      const isSameId = prev.selectedId === id;
      const newShowOptions = !prev.showOptions || !isSameId;
      const newSelectedId = newShowOptions ? id : null;
      return {
        showOptions: newShowOptions,
        selectedId: newSelectedId,
      };
    });
  },
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigateFrom = location.pathname;

  const { appURL, user, userDoc } = useSharedProps();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showManageAccessModal, setShowManageAccessModal] = useState(false);
  const [showViewCollabModal, setShowViewCollabModal] = useState(false);
  const [isViewCollab, setIsViewCollab] = useState(true);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCopyLinkModal, setShowCopyLinkModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const optionsRef = useRef(null);

  useEffect(() => {
    // Find access level of the user (to display Manage Access/View Collaborators in ShareMenu)
    if (isDesign) {
      const design = object;
      if (!design || !user || !userDoc) return;
      // Check if user is owner or editor (manage access), then commenters and viewers (view only)
      if (userDoc.id === design.owner || userDoc.id === design.ownerId) {
        setIsViewCollab(false);
        return;
      }
      if (design.editors?.includes(userDoc.id)) {
        setIsViewCollab(false);
        return;
      }
      if (design.commenters?.includes(userDoc.id) || design.viewers?.includes(userDoc.id)) {
        setIsViewCollab(true);
        return;
      }
      setIsViewCollab(true);
    } else {
      const project = object;
      if (!project || !user || !userDoc) return;

      // Check if user is manager or content manager (manage access), then contributor and viewers (view only)
      if (project.managers?.includes(userDoc.id)) {
        setIsViewCollab(false);
        return;
      }
      if (project.contentManagers?.includes(userDoc.id)) {
        setIsViewCollab(false);
        return;
      }
      if (project.contributors?.includes(userDoc.id) || project.viewers?.includes(userDoc.id)) {
        setIsViewCollab(true);
        return;
      }
      setIsViewCollab(true);
    }
  }, [object, user, userDoc]);

  const handleToggleOptions = (id) => {
    setClickedId(id);
    if (clickedId === id) {
      setClickedId(null);
    }
  };

  const handleClickOutside = (event) => {
    if (optionsRef.current && !optionsRef.current.contains(event.target)) {
      toggleOptions(id);
      setIsShareMenuOpen(false);
    }
  };

  // Share Functions
  const openShareModal = () => {
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    toggleOptions(id);
  };

  const openManageAccessModal = () => {
    setShowManageAccessModal(true);
  };

  const closeManageAccessModal = () => {
    setShowManageAccessModal(false);
    toggleOptions(id);
  };

  const openViewCollabModal = () => {
    setShowViewCollabModal(true);
  };

  const closeViewCollabModal = () => {
    setShowViewCollabModal(false);
    toggleOptions(id);
  };

  // Copy Link Functions
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${appURL}/${isDesign ? "design" : "project"}/${id}`);
      showToast("success", "Link copied to clipboard!");
      toggleOptions(id);
    } catch (err) {
      showToast("error", "Failed to copy link.");
      console.error("Failed to copy: ", err);
    }
  };

  const closeCopyLinkModal = () => {
    setShowCopyLinkModal(false);
  };

  // Settings Fucntions
  const handleSettings = () => {
    navigate(`/settings/${isDesign ? "design" : "project"}/${id}`, {
      state: { navigateFrom: navigateFrom },
    });
  };

  // Download Functions
  const openDownloadModal = () => {
    setShowDownloadModal(true);
  };

  const closeDownloadModal = () => {
    setShowDownloadModal(false);
    toggleOptions(id);
  };

  // Add Collaborators Modal Action
  const handleShare = async (object, emails, role, message, notifyPeople = false) => {
    if (emails.length === 0) {
      return { success: false, message: "No email addresses added" };
    }
    if (!role) {
      return { success: false, message: "Select a role" };
    }
    try {
      let result;
      if (isDesign) {
        result = await handleAddCollaboratorsDesign(
          object,
          emails,
          role,
          message,
          notifyPeople,
          user,
          userDoc
        );
      } else {
        result = await handleAddCollaboratorsProject(
          object,
          emails,
          role,
          message,
          notifyPeople,
          user,
          userDoc
        );
      }
      if (result.success) {
        closeShareModal();
        return {
          success: true,
          message: `${isDesign ? "Design" : "Project"} shared to collaborators`,
        };
      } else {
        return {
          success: false,
          message: `Failed to share ${isDesign ? "design" : "project"} to collaborators`,
        };
      }
    } catch (error) {
      console.error(`Error sharing ${isDesign ? "design" : "project"}:`, error);
      return {
        success: false,
        message: `Failed to share ${isDesign ? "design" : "project"} to collaborators`,
      };
    }
  };

  // Manage Access Modal Action
  const handleAccessChange = async (
    object,
    initEmailsWithRole,
    emailsWithRole,
    generalAccessSetting,
    generalAccessRole
  ) => {
    // If no roles have changed, return early
    if (isDesign) {
      if (
        deepEqual(initEmailsWithRole, emailsWithRole) &&
        generalAccessSetting === object?.designSettings?.generalAccessSetting &&
        generalAccessRole === object?.designSettings?.generalAccessRole
      ) {
        return { success: false, message: "Nothing changed" };
      }
    } else {
      if (
        deepEqual(initEmailsWithRole, emailsWithRole) &&
        generalAccessSetting === object?.projectSettings?.generalAccessSetting &&
        generalAccessRole === object?.projectSettings?.generalAccessRole
      ) {
        return { success: false, message: "Nothing changed" };
      }
    }

    try {
      let result;
      if (isDesign) {
        result = await handleAccessChangeDesign(
          object,
          initEmailsWithRole,
          emailsWithRole,
          generalAccessSetting,
          generalAccessRole,
          user,
          userDoc
        );
      } else {
        result = await handleAccessChangeProject(
          object,
          initEmailsWithRole,
          emailsWithRole,
          generalAccessSetting,
          generalAccessRole,
          user,
          userDoc
        );
      }
      if (result.success) {
        closeManageAccessModal();
        return {
          success: true,
          message: `${isDesign ? "Design" : "Project"} access changed`,
        };
      } else {
        return {
          success: false,
          message: `Failed to change access of ${isDesign ? "design" : "project"}`,
        };
      }
    } catch (error) {
      console.error(`Error changing access of ${isDesign ? "design" : "project"}`, error);
      return {
        success: false,
        message: `Failed to change access of ${isDesign ? "design" : "project"}`,
      };
    }
  };

  // Make a Copy Functions
  const openCopyModal = () => {
    setShowCopyModal(true);
  };

  const closeCopyModal = () => {
    setShowCopyModal(false);
    toggleOptions(id);
  };

  // Make a Copy Modal Action
  const handleCopy = async (design, designVersionId, shareWithCollaborators = false) => {
    if (!designVersionId) {
      return { success: false, message: "Select a version to copy" };
    }
    try {
      const result = await handleCopyDesign(
        design,
        designVersionId,
        shareWithCollaborators,
        user,
        userDoc
      );
      if (result.success) {
        closeCopyModal();
        return { success: true, message: "Design copied" };
      } else {
        return { success: false, message: "Failed to copy design" };
      }
    } catch (error) {
      console.error("Error copying design:", error);
      return { success: false, message: "Failed to copy design" };
    }
  };

  // Rename Functions
  const openRenameModal = () => {
    setShowRenameModal(true);
  };

  const closeRenameModal = () => {
    setShowRenameModal(false);
    toggleOptions(id);
  };

  const handleRename = async (newName) => {
    if (isDesign) {
      if (object.designName === newName.trim()) {
        return { success: false, message: "Name is the same as the current name." };
      }
    } else {
      if (object.projectName === newName.trim()) {
        return { success: false, message: "Name is the same as the current name." };
      }
    }
    try {
      let result;
      if (isDesign) {
        result = await handleNameChangeDesign(object.id, newName, user, userDoc, setIsEditingName);
      } else {
        result = await handleNameChangeProject(object.id, newName, user, userDoc, setIsEditingName);
      }
      console.log("result", result);
      if (result.success) {
        closeRenameModal();
        return {
          success: true,
          message: `${isDesign ? "Design" : "Project"} name updated successfully`,
        };
      } else {
        return {
          success: false,
          message: `Failed to update ${isDesign ? "design" : "project"} name`,
        };
      }
    } catch (error) {
      console.error(`Error updating ${isDesign ? "design" : "project"} name:`, error);
      return {
        success: false,
        message: `Failed to update ${isDesign ? "design" : "project"} name`,
      };
    }
  };

  // Delete Functions
  const openDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    toggleOptions(id);
  };

  const handleDelete = (userId, id, navigate) => {
    if (isDesign) handleDeleteDesign(userId, id, navigate);
    else handleDeleteProject(userId, id, navigate);
    closeDeleteModal();
  };

  // Info Functions
  const handleOpenInfoModal = () => {
    navigate(`/details/${isDesign ? "design" : "project"}/${id}`, {
      state: { navigateFrom: navigateFrom },
    });
  };

  const handleCloseInfoModal = () => {
    // setIsInfoModalOpen(false);
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      console.log("is it a table" + isTable);
    };
  }, []);

  return (
    <>
      {/* Options button */}
      <div className={isTable ? "options-table" : "options"} data-options>
        {!isTable && (
          <h3 className="selectOption">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleToggleOptions(id);
              }}
              sx={{ color: "var(--color-white)" }}
            >
              <MoreVertIcon style={{ fontSize: 20 }} />
            </IconButton>
          </h3>
        )}
        {optionsState.showOptions &&
          optionsState.selectedId === id &&
          (isShareMenuOpen ? (
            <ShareMenu
              onClose={() => setIsShareMenuOpen(false)}
              onBackToMenu={() => setIsShareMenuOpen(false)}
              onOpenShareModal={openShareModal}
              onOpenManageAccessModal={openManageAccessModal}
              onOpenManageAccessModalView={openViewCollabModal}
              isViewCollab={isViewCollab}
              isHomepage={true}
              isDrawer={isDrawer}
            />
          ) : (
            <div
              ref={optionsRef}
              className={`dropdown-menu ${isTable ? "table" : ""} ${isDrawer ? "drawer" : ""}`}
              style={{
                position: "absolute",
                top: isTable ? "0" : "0",
                marginTop: isTable ? "0" : "10px",
              }}
            >
              <div className="dropdown-item" onClick={onOpen}>
                <OpenInNewIcon style={{ fontSize: 20 }} className="icon" />
                Open
              </div>
              <div className="dropdown-item" onClick={() => setIsShareMenuOpen(true)}>
                <div className="icon">
                  <ShareIcon style={{ fontSize: 20 }} />
                </div>
                Share
              </div>
              <div className="dropdown-item" onClick={handleCopyLink}>
                <div className="icon">
                  <CopyLinkIcon style={{ fontSize: 20 }} className="icon" />
                </div>
                Copy Link
              </div>
              <div className="dropdown-item" onClick={handleSettings}>
                <div className="icon">
                  <SettingsIcon style={{ fontSize: 20 }} className="icon" />
                </div>
                Settings
              </div>
              <div className="dropdown-item" onClick={openDownloadModal}>
                <div className="icon">
                  <DownloadIcon style={{ fontSize: 20 }} className="icon" />
                </div>
                Download
              </div>
              {isDesign && (
                <div className="dropdown-item" onClick={openCopyModal}>
                  <div className="icon">
                    <MakeACopyIcon style={{ fontSize: 20 }} className="icon" />
                  </div>
                  Make a copy
                </div>
              )}
              <div className="dropdown-item" onClick={openRenameModal}>
                <div className="icon">
                  <RenameIcon style={{ fontSize: 20 }} className="icon" />
                </div>
                Rename
              </div>
              <div className="dropdown-item" onClick={openDeleteModal}>
                <div className="icon">
                  <DeleteIcon style={{ fontSize: 20 }} className="icon" />
                </div>
                Delete
              </div>
              <div className="dropdown-item" onClick={handleOpenInfoModal}>
                <div className="icon">
                  <DetailsIcon style={{ fontSize: 20 }} className="icon" />
                </div>
                Details
              </div>
            </div>
          ))}
      </div>

      {/* Share */}
      <ShareModal
        isOpen={showShareModal}
        onClose={closeShareModal}
        handleShare={handleShare}
        isDesign={isDesign}
        object={object}
        onShowViewCollab={() => {
          closeShareModal();
          setShowViewCollabModal(true);
        }}
      />
      <ManageAccessModal
        isOpen={showManageAccessModal}
        onClose={closeManageAccessModal}
        handleAccessChange={handleAccessChange}
        isDesign={isDesign}
        object={object}
        isViewCollab={false}
        onShowViewCollab={() => {
          closeManageAccessModal();
          setShowViewCollabModal(true);
        }}
      />
      <ManageAccessModal
        isOpen={showViewCollabModal}
        onClose={closeViewCollabModal}
        handleAccessChange={() => {}}
        isDesign={isDesign}
        object={object}
        isViewCollab={true}
      />
      {/* Download */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={closeDownloadModal}
        isDesign={isDesign}
        object={object}
      />
      {/* Make a Copy */}
      <MakeCopyModal
        isOpen={showCopyModal}
        onClose={closeCopyModal}
        handleCopy={handleCopy}
        design={object}
      />
      {/* Rename */}
      <RenameModal
        isOpen={showRenameModal}
        onClose={closeRenameModal}
        handleRename={handleRename}
        isDesign={isDesign}
        object={object}
      />
      {/* Delete */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        handleDelete={() => handleDelete(userDoc.id, id, navigate)}
        isDesign={isDesign}
        object={object}
      />
      {/* Details */}
      <InfoModal isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} />
    </>
  );
}

export default HomepageOptions;
