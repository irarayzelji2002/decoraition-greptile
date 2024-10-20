import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TopBar from "../../components/TopBar";
import { db } from "../../firebase"; // Import your Firestore instance
import { doc, getDoc } from "firebase/firestore";
import {
  Typography,
  Box,
  Switch,
  TextField,
  Button,
  FormControlLabel,
  MenuItem,
  Select,
  ThemeProvider,
} from "@mui/material";
import "../../css/projSettings.css"; // Import the CSS file
import PublicIcon from "@mui/icons-material/Public"; // Import the globe icon
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  components: {
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "& .MuiSwitch-thumb": {
            backgroundColor: "var(--color-white)", // Color of the switch thumb
          },
          "&.Mui-checked .MuiSwitch-thumb": {
            backgroundImage: "var(--gradientCircle)", // Color when checked
          },
          "&.Mui-checked + .MuiSwitch-track": {
            backgroundColor: "var(--inputBg)", // Track color when checked
          },
        },
        track: {
          backgroundColor: "var(--inputBg)", // Track color
        },
      },
    },
  },
});

export default function ProjectSettings() {
  const { projectId } = useParams(); // Get the designId parameter from the URL
  const [projectName, setProjectName] = useState("");
  const [generalAccess, setGeneralAccess] = useState("Anyone with the link");
  const [allowDownload, setAllowDownload] = useState(false);
  const [inactivityEnabled, setInactivityEnabled] = useState(false);
  const [inactivityDays, setInactivityDays] = useState(90);
  const [deletionDays, setDeletionDays] = useState(30);
  const [notifyDays, setNotifyDays] = useState(7);
  const [activeTab, setActiveTab] = useState("Project"); // Default active tab

  useEffect(() => {
    // Fetch the design name based on the designId
    const fetchProjectName = async () => {
      try {
        const designDoc = await getDoc(doc(db, "projects", projectId));
        if (designDoc.exists()) {
          setProjectName(designDoc.data().name);
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching design name:", error);
      }
    };

    fetchProjectName();
  }, [projectId]);

  const handleTabChange = (tab) => {
    setActiveTab(tab); // Change active tab
  };

  return (
    <div>
      <TopBar state={`Project Settings for ${projectName}`} />
      <SettingsContent
        generalAccess={generalAccess}
        setGeneralAccess={setGeneralAccess}
        allowDownload={allowDownload}
        setAllowDownload={setAllowDownload}
        inactivityEnabled={inactivityEnabled}
        setInactivityEnabled={setInactivityEnabled}
        inactivityDays={inactivityDays}
        setInactivityDays={setInactivityDays}
        deletionDays={deletionDays}
        setDeletionDays={setDeletionDays}
        notifyDays={notifyDays}
        setNotifyDays={setNotifyDays}
        activeTab={activeTab} // Pass activeTab to SettingsContent
        handleTabChange={handleTabChange} // Pass handleTabChange function
      />
    </div>
  );
}

const SettingsContent = ({
  generalAccess,
  setGeneralAccess,
  allowDownload,
  setAllowDownload,
  inactivityEnabled,
  setInactivityEnabled,
  inactivityDays,
  setInactivityDays,
  deletionDays,
  setDeletionDays,
  notifyDays,
  setNotifyDays,
  activeTab, // New prop to control the active tab
  handleTabChange, // Function to change the active tab
}) => (
  <ThemeProvider theme={theme}>
    <div className="settingsContainer">
      {/* Tab Navigation */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        {["Project", "Timeline", "Plan Map", "Budget"].map((tab) => (
          <Typography
            key={tab}
            onClick={() => handleTabChange(tab)}
            sx={{
              fontSize: 18,
              fontWeight: "bold",
              textTransform: "none",
              cursor: "pointer",
              paddingBottom: 1,
              backgroundImage: activeTab === tab ? "var(--gradientFont)" : "none", // Gradient only for active tab
              backgroundClip: activeTab === tab ? "text" : "unset",
              WebkitBackgroundClip: activeTab === tab ? "text" : "unset",
              color: activeTab === tab ? "transparent" : "var(--color-white)",
              borderBottom: activeTab === tab ? "2px solid transparent" : "none",
              borderImage: activeTab === tab ? "var(--gradientFont) 1" : "none", // Gradient for border bottom
              borderImageSlice: activeTab === tab ? 1 : "none",
              "&:focus": {
                outline: "none",
                backgroundColor: "transparent",
              },
              "&:active": {
                outline: "none",
                backgroundColor: "transparent",
              },
            }}
          >
            {tab}
          </Typography>
        ))}
      </Box>

      {/* General Access */}
      <div className="generalAccessTitle">General Access</div>
      <Box className="accessBox">
        <Box className="accessIcon">
          <PublicIcon sx={{ color: "var(--color-white)" }} />
        </Box>
        <Select
          value={generalAccess}
          onChange={(e) => setGeneralAccess(e.target.value)}
          className="accessSelect"
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--borderInput)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--bright-grey)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--bright-grey)",
            },
            "& .MuiSelect-select": {
              color: "var(--color-white)",
            },
            "& .MuiSvgIcon-root": {
              color: "var(--color-white)", // Set the arrow icon color to white
            },
          }}
        >
          <MenuItem
            value="Anyone with the link"
            sx={{
              backgroundColor: "var(--bgColor)",
              color: "var(--color-white)",
              "&:hover": {
                backgroundColor: "var(--dropdownHover)",
                color: "var(--color-white)",
              },
              "&.Mui-selected": {
                backgroundColor: "var(--dropdownSelected)",
                color: "var(--color-white)",
              },
              "& .MuiSvgIcon-root": {
                color: "var(--color-white)", // Set the arrow icon color to white
              },
            }}
          >
            Anyone with the link
          </MenuItem>
          <MenuItem
            value="Restricted"
            sx={{
              backgroundColor: "var(--bgColor)",
              color: generalAccess === "Restricted" ? "var(--color-white)" : "var(--color-grey)",
              "&:hover": {
                backgroundColor: "var(--dropdownHover)",
                color: "var(--color-white)",
              },
              "&.Mui-selected": {
                backgroundColor: "var(--dropdownSelected)",
                color: "var(--color-white)",
              },
            }}
          >
            Restricted
          </MenuItem>
        </Select>
      </Box>

      {/* Viewer Settings */}
      <Typography className="viewerSettingsTitle">Viewer settings</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={allowDownload}
            onChange={(e) => setAllowDownload(e.target.checked)}
            color="warning"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: "var(--inputBg)",
              },
              "& .MuiSwitch-thumb": {
                backgroundImage: "var(--color-white)", // Apply gradient to the thumb
              },
              "& .MuiSwitch-track": {
                backgroundColor: "var(--inputBg)", // Track color
              },
            }}
          />
        }
        label="Allow to download"
        labelPlacement="start"
        className="viewerSettingsLabel"
      />

      {/* The following section is only for the Project tab */}
      {activeTab === "Project" && ( // Change this condition based on the active tab
        <>
          {/* Inactivity and Deletion */}
          <Typography className="inactivityTitle">Inactivity and deletion</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={inactivityEnabled}
                onChange={(e) => setInactivityEnabled(e.target.checked)}
                color="warning"
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "var(--inputBg)",
                  },
                  "& .MuiSwitch-thumb": {
                    backgroundImage: "var(--color-white)", // Apply gradient to the thumb
                  },
                  "& .MuiSwitch-track": {
                    backgroundColor: "var(--inputBg)", // Track color
                  },
                }}
              />
            }
            label="Enable inactivity and deletion"
            labelPlacement="start"
            className="inactivityLabel"
          />

          {/* Inactivity Settings */}
          {inactivityEnabled && (
            <>
              <Box className="inactivitySettings">
                <Typography>Number of days before inactivity after user inactivity</Typography>
                <TextField
                  type="number"
                  value={inactivityDays}
                  onChange={(e) => setInactivityDays(e.target.value)}
                  className="inactivityTextField"
                  inputProps={{
                    style: {
                      backgroundColor: "var(--bgcolor)",
                      color: "var(--color-white)",
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderColor: "var(--borderInput)",
                      "& fieldset": {
                        borderColor: "var(--borderInput)",
                      },
                      "&:hover fieldset": {
                        borderColor: "var(--bright-grey)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "var(--bright-grey)",
                      },
                    },
                    "& input": {
                      color: "var(--color-white)",
                    },
                  }}
                />
              </Box>

              <Box className="inactivitySettings">
                <Typography>Number of days before deletion after project inactivity</Typography>
                <TextField
                  type="number"
                  value={deletionDays}
                  onChange={(e) => setDeletionDays(e.target.value)}
                  className="inactivityTextField"
                  inputProps={{
                    style: {
                      backgroundColor: "var(--bgcolor)",
                      color: "var(--color-white)",
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderColor: "var(--borderInput)",
                      "& fieldset": {
                        borderColor: "var(--borderInput)",
                      },
                      "&:hover fieldset": {
                        borderColor: "var(--bright-grey)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "var(--bright-grey)",
                      },
                    },
                    "& input": {
                      color: "var(--color-white)",
                    },
                  }}
                />
              </Box>

              <Box className="inactivitySettings">
                <Typography>
                  Notify collaborators number of days prior to entering inactivity mode and deletion
                </Typography>
                <TextField
                  type="number"
                  value={notifyDays}
                  onChange={(e) => setNotifyDays(e.target.value)}
                  className="inactivityTextField"
                  inputProps={{
                    style: {
                      backgroundColor: "var(--bgcolor)",
                      color: "var(--color-white)",
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderColor: "var(--borderInput)",
                      "& fieldset": {
                        borderColor: "var(--borderInput)",
                      },
                      "&:hover fieldset": {
                        borderColor: "var(--bright-grey)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "var(--bright-grey)",
                      },
                    },
                    "& input": {
                      color: "var(--color-white)",
                    },
                  }}
                />
              </Box>
            </>
          )}
        </>
      )}

      {/* Save Button */}
      <Box className="saveButtonContainer">
        <Button className="saveButton">Save</Button>
      </Box>
    </div>
  </ThemeProvider>
);
