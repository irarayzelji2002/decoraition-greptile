import axios from "axios";
import { showToast } from "../../../functions/utils";

export const handleCommentTabClick = (side, setActiveCommentTab) => {
  setActiveCommentTab(side);
};

export const handleStatusTabClick = (side, setActiveStatusTab) => {
  setActiveStatusTab(side);
};

export const handleContainerClick = (setClicked) => {
  setClicked((prev) => !prev); // Toggle clicked state
};

export const toggleComments = (setShowComments) => {
  setShowComments((prev) => !prev);
};

export const togglePromptBar = (setShowPromptBar) => {
  setShowPromptBar((prev) => !prev);
};

export const handleSidebarEffect = (isSidebarOpen) => {
  if (isSidebarOpen) {
    document.body.style.overflow = "hidden"; // Disable body scroll
  } else {
    document.body.style.overflow = "auto"; // Enable body scroll
  }

  return () => {
    document.body.style.overflow = "auto"; // Clean up on component unmount
  };
};

export const getDesignImage = (designId, userDesigns, userDesignVersions, index = 0) => {
  // Check if userDesigns and userDesignVersions are defined and are arrays
  if (!Array.isArray(userDesigns) || !Array.isArray(userDesignVersions)) {
    console.error("userDesigns or userDesignVersions is not an array");
    return "";
  }

  // Get the design
  const fetchedDesign = userDesigns.find((design) => design.id === designId);
  if (!fetchedDesign || !fetchedDesign.history || fetchedDesign.history.length === 0) {
    console.log("Design not found or has no history");
    return "";
  }

  // Get the latest designVersionId
  const latestDesignVersionId = fetchedDesign.history[fetchedDesign.history.length - 1];
  const fetchedLatestDesignVersion = userDesignVersions.find(
    (designVer) => designVer.id === latestDesignVersionId
  );
  if (
    !fetchedLatestDesignVersion ||
    !fetchedLatestDesignVersion.images ||
    fetchedLatestDesignVersion.images.length === 0
  ) {
    console.log("Latest design version not found or has no images");
    return "";
  }

  // Check if the requested index exists
  if (index >= fetchedLatestDesignVersion.images.length) {
    console.error("Requested image index out of bounds");
    return "";
  }

  // Return the first image's link from the fetched design version
  return fetchedLatestDesignVersion.images[index].link || "";
};

export const handleNameChange = async (designId, newName, user, setIsEditingName) => {
  try {
    const response = await axios.put(
      `/api/design/${designId}/update-name`,
      { name: newName },
      {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      }
    );
    if (response.status === 200) {
      setIsEditingName(false);
      return { success: true, message: "Design name updated successfully" };
    }
  } catch (error) {
    console.error("Error updating design name:", error);
    return { success: false, message: "Failed to update design name" };
  }
};

export const fetchVersionDetails = async (design, user) => {
  if (design?.history && design.history.length > 0) {
    try {
      const response = await axios.get(`/api/design/${design.id}/version-details`, {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });
      return { success: true, versionDetails: response.data.versionDetails };
    } catch (error) {
      console.error("Error fetching version details:", error);
      return { success: false, versionDetails: [], message: "Failed to fetch version details" };
    }
  }
  return { success: false, versionDetails: [], message: "No history available" };
};

export const handleRestoreDesignVersion = async (design, designVersionId, user) => {
  try {
    const response = await axios.post(
      `/api/design/${design.id}/restore/${designVersionId}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      }
    );

    if (response.data.success) {
      return {
        success: true,
        message: "Design version restored successfully",
      };
    } else {
      return {
        success: false,
        message: "Failed to restore design version",
      };
    }
  } catch (error) {
    console.error("Error restoring design version:", error);
    return {
      success: false,
      message: error.response?.data?.error || "Failed to restore design version",
    };
  }
};

export const handleCopyDesign = async (design, designVersionId, shareWithCollaborators, user) => {
  try {
    const response = await axios.post(
      `/api/design/${design.id}/copy/${designVersionId}`,
      { userId: user.id, shareWithCollaborators },
      {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      }
    );

    if (response.data.success) {
      return {
        success: true,
        message: "Design copied successfully",
      };
    } else {
      return {
        success: false,
        message: "Failed to copy design",
      };
    }
  } catch (error) {
    console.error("Error copying design:", error);
    return {
      success: false,
      message: error.response?.data?.error || "Failed to copy design",
    };
  }
};

export const handleAddCollaborators = async (design, emails, role, message, notifyPeople, user) => {
  try {
    const response = await axios.post(
      `/api/design/${design.id}/share`,
      { userId: user.id, emails, role, message, notifyPeople },
      {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      }
    );

    if (response.data.success) {
      return {
        success: true,
        message: "Design shared successfully",
      };
    } else {
      return {
        success: false,
        message: "Failed to share design",
      };
    }
  } catch (error) {
    console.error("Error sharing design:", error);
    return {
      success: false,
      message: error.response?.data?.error || "Failed to share design",
    };
  }
};

export const handleAccessChange = async (design, initEmailsWithRole, emailsWithRole, user) => {
  try {
    const response = await axios.post(
      `/api/design/${design.id}/change-access`,
      { userId: user.id, initEmailsWithRole, emailsWithRole },
      {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      }
    );

    if (response.data.success) {
      return {
        success: true,
        message: "Design collaborators' access changed",
      };
    } else {
      return {
        success: false,
        message: "Failed to change access of design collaborators",
      };
    }
  } catch (error) {
    console.error("Error changing access of design collaborators:", error);
    return {
      success: false,
      message: error.response?.data?.error || "Failed to change access of design collaborators",
    };
  }
};

export const handleEditDescription = async (
  designId,
  designVersionId,
  imageId,
  description,
  user
) => {
  try {
    const response = await axios.put(
      `/api/design/${designId}/design-version/${designVersionId}/update-desc`,
      { description, imageId },
      {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      }
    );
    if (response.status === 200) {
      return { success: true, message: `Image ${imageId} description updated successfully` };
    }
  } catch (error) {
    console.error(
      `Error updating design version ${designVersionId} image ${imageId} description:`,
      error
    );
    return { success: false, message: `Failed to update image ${imageId} description` };
  }
};

export const handleAddColorPalette = async (colorPalette, user, userDoc) => {
  if (!colorPalette) {
    console.error("Color palette is empty");
    return { success: false, message: "No color palette passed" };
  } else {
    if (!colorPalette.paletteName) {
      console.error("Color palette name is required");
      return { success: false, message: "Color palette name is required" };
    } else if (!colorPalette.colors || colorPalette.colors.length === 0) {
      console.error("Color palette colors are required");
      return { success: false, message: "Color palette must have at least one color" };
    }
  }
  try {
    const response = await axios.post(
      `/api/user/add-color-palette`,
      { userId: userDoc.id, colorPalette: colorPalette },
      {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      }
    );
    if (response.status === 200) {
      return { success: true, message: "Color palette added successfully" };
    }
  } catch (error) {
    console.error("Error adding color palette:", error);
    return { success: false, message: "Failed to add color palette" };
  }
};

export const handleEditColorPalette = async (colorPalette, colorPaletteToEdit, user, userDoc) => {
  if (!colorPalette || !colorPalette.colorPaletteId) {
    console.error("Color palette is empty");
    return { success: false, message: "No color palette passed" };
  } else {
    if (!colorPalette.paletteName) {
      console.error("Color palette name is required");
      return { success: false, message: "Color palette name is required" };
    } else if (colorPalette.paletteName === colorPaletteToEdit.paletteName) {
      console.error("Color palette name is the same as the current name");
      return { success: false, message: "Name is the same as the current name" };
    } else if (!colorPalette.colors || colorPalette.colors.length === 0) {
      console.error("Color palette colors are required");
      return { success: false, message: "Color palette must have at least one color" };
    }
  }
  try {
    const response = await axios.put(
      `/api/user/update-color-palette`,
      { userId: userDoc.id, colorPalette: colorPalette },
      {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      }
    );
    if (response.status === 200) {
      return { success: true, message: "Color palette updated successfully" };
    }
  } catch (error) {
    console.error("Error updating color palette:", error);
    return { success: false, message: "Failed to update color palette" };
  }
};

export const handleDeleteColorPalette = async (colorPalette, user, userDoc) => {
  if (!colorPalette || !colorPalette.colorPaletteId) {
    console.error("Color palette is empty");
    return { success: false, message: "No color palette to delete" };
  }
  try {
    const response = await axios.put(
      `/api/user/delete-color-palette`,
      { userId: userDoc.id, colorPalette: colorPalette },
      {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      }
    );
    if (response.status === 200) {
      return { success: true, message: "Color palette deleted successfully" };
    }
  } catch (error) {
    console.error("Error deleting color palette:", error);
    return { success: false, message: "Failed to delete color palette" };
  }
};
