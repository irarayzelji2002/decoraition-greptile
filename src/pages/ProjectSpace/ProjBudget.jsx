import "../../css/project.css";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ExportIcon from "./svg/ExportIcon";
import {
  fetchProjectDesigns,
  fetchProjectBudget,
  updateProjectBudget,
} from "./backend/ProjectDetails";
import { showToast } from "../../functions/utils";
import { useSharedProps } from "../../contexts/SharedPropsContext";
import { fetchVersionDetails, getDesignImage } from "../DesignSpace/backend/DesignActions";
import { iconButtonStyles } from "../Homepage/DrawerComponent";
import Loading from "../../components/Loading";
import deepEqual from "deep-equal";
import ProjectSpace from "./ProjectSpace";
import {
  isManagerProject,
  isManagerContentManagerProject,
  isManagerContentManagerContributorProject,
  isCollaboratorProject,
} from "./Project";
import { IconButton } from "@mui/material";
import {
  AddIconGradient,
  EditIconSmallGradient,
  DeleteIconGradient,
  AddIcon,
  DeleteIconWhite,
  EditIconWhite,
} from "../../components/svg/DefaultMenuIcons";
import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  dialogActionsStyles,
  dialogContentStyles,
  dialogStyles,
  dialogTitleStyles,
} from "../../components/RenameModal";
import CurrencySelect from "../../components/CurrencySelect";
import { gradientButtonStyles, outlinedButtonStyles } from "../DesignSpace/PromptBar";
import { textFieldInputProps } from "../DesignSpace/DesignSettings";
import { AddBudget } from "../DesignSpace/svg/AddImage";
import { getAllISOCodes, getAllInfoByISO } from "iso-country-currency";

const getPHCurrency = () => {
  let currency = {
    countryISO: "PH",
    currencyCode: "PHP",
    currencyName: "Philippines",
    currencySymbol: "₱",
    flagEmoji: "🇵🇭",
  };
  return currency;
};

function ProjBudget() {
  const { projectId } = useParams();
  const { isDarkMode, projects, userProjects } = useSharedProps();
  const navigate = useNavigate();
  const location = useLocation();
  const [changeMode, setChangeMode] = useState(location?.state?.changeMode || "");
  const [project, setProject] = useState({});

  const [designs, setDesigns] = useState([]);
  const {
    user,
    userDoc,
    userBudgets,
    items,
    userItems,
    budgets,
    userDesigns,
    designVersions,
    userDesignVersions,
  } = useSharedProps();
  const [designBudgetItems, setDesignBudgetItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [designImages, setDesignImages] = useState({});
  const [itemImages, setItemImages] = useState({});
  const [loadingProject, setLoadingProject] = useState(true);
  const formatNumber = (num) => (typeof num === "number" ? num.toFixed(2) : "0.00");

  const [isManager, setIsManager] = useState(false);
  const [isManagerContentManager, setIsManagerContentManager] = useState(false);
  const [isManagerContentManagerContributor, setIsManagerContentManagerContributor] =
    useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [formattedTotalCost, setFormattedTotalCost] = useState("0.00");
  const [menuOpen, setMenuOpen] = useState(false);

  const [projectBudget, setProjectBudget] = useState({});
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isRemoveBudgetModalOpen, setIsRemoveBudgetModalOpen] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState(getPHCurrency());
  const [budgetAmount, setBudgetAmount] = useState(0);
  const [budgetCurrencyForInput, setBudgetCurrencyForInput] = useState(getPHCurrency());
  const [budgetAmountForInput, setBudgetAmountForInput] = useState("");
  const [isBudgetButtonDisabled, setIsBudgetButtonDisabled] = useState(false);
  const [isConfirmRemoveBudgetBtnDisabled, setIsConfirmRemoveBudgetBtnDisabled] = useState(false);
  const [error, setError] = useState("");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [currencyDetails, setCurrencyDetails] = useState([]);
  const [totalCosts, setTotalCosts] = useState({});

  // Currency Functions
  const isoToFlagEmoji = (isoCode) => {
    return isoCode
      .toUpperCase() // Ensure uppercase
      .replace(
        /./g,
        (char) => String.fromCodePoint(127397 + char.charCodeAt(0)) // Offset to flag Unicode range
      );
  };

  const getCurrencyData = () => {
    const allISO = getAllISOCodes(); // Returns an array of objects, not just ISO codes

    const currencyDetails = allISO.map((country) => {
      const countryInfo = getAllInfoByISO(country.iso); // Pass the ISO code string
      const currencyCode = countryInfo?.currency || country.currency;
      const currencyName = countryInfo?.countryName || currencyCode;
      const currencySymbol = countryInfo?.symbol || currencyCode;
      return {
        currencyCode,
        flagEmoji: isoToFlagEmoji(country.iso), // Alpha-2 ISO code for FlagIcon
        currencyName,
        currencySymbol,
        countryISO: country.iso,
      };
    });

    return currencyDetails;
  };

  useEffect(() => {
    const currencyArray = getCurrencyData();
    setCurrencyDetails(currencyArray);
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Modify the toggleBudgetModal function to ensure proper data population
  const toggleBudgetModal = (opening, editing) => {
    setMenuOpen(false);
    if (opening) {
      if (editing) {
        setIsEditingBudget(true);
        // Set current budget values when editing
        setBudgetAmountForInput(projectBudget?.budget?.amount?.toString() || "");
        setBudgetCurrencyForInput(projectBudget?.budget?.currency || getPHCurrency());
      } else {
        setIsEditingBudget(false);
        // Set default values when adding new
        setBudgetAmountForInput("");
        setBudgetCurrencyForInput(getPHCurrency());
      }
      setError("");
    } else {
      // Reset to current values when closing
      setBudgetAmountForInput(projectBudget?.budget?.amount?.toString() || "");
      setBudgetCurrencyForInput(projectBudget?.budget?.currency || getPHCurrency());
    }
    setIsBudgetModalOpen(!isBudgetModalOpen);
  };

  // Add a useEffect to handle initial budget data
  useEffect(() => {
    if (projectBudget?.budget) {
      setBudgetAmount(projectBudget.budget.amount);
      setBudgetCurrency(projectBudget.budget.currency || getPHCurrency());
    }
  }, [projectBudget]);

  // Add validation before opening modal
  const handleOpenBudgetModal = (editing) => {
    if (!projectId) {
      showToast("error", "Project ID is required");
      return;
    }

    if (editing && !projectBudget?.budget) {
      showToast("error", "No budget data found to edit");
      return;
    }

    toggleBudgetModal(true, editing);
  };

  // Get project
  useEffect(() => {
    if (projectId && (userProjects.length > 0 || projects.length > 0)) {
      const fetchedProject =
        userProjects.find((d) => d.id === projectId) || projects.find((d) => d.id === projectId);

      if (!fetchedProject) {
        console.error("Project not found.");
        setLoadingProject(false);
      } else {
        // Check if user has access
        const hasAccess = isCollaboratorProject(fetchedProject, userDoc?.id);
        if (!hasAccess) {
          console.error("No access to project.");
          setLoadingProject(false);
          showToast("error", "You don't have access to this project");
          navigate("/");
          return;
        }

        if (Object.keys(project).length === 0 || !deepEqual(project, fetchedProject)) {
          setProject(fetchedProject);
          console.log("current project:", fetchedProject);
        }
      }
    }
    setLoadingProject(false);
  }, [projectId, projects, userProjects, isCollaborator]);

  // Initialize access rights
  useEffect(() => {
    if (!project?.projectSettings || !userDoc?.id) return;
    // Check if user has any access
    const hasAccess = isCollaboratorProject(project, userDoc.id);
    if (!hasAccess) {
      showToast("error", "You don't have access to this project");
      navigate("/");
      return;
    }
    // If they have access, proceed with setting roles
    setIsManager(isManagerProject(project, userDoc.id));
    setIsManagerContentManager(isManagerContentManagerProject(project, userDoc.id));
    setIsManagerContentManagerContributor(
      isManagerContentManagerContributorProject(project, userDoc.id)
    );
    setIsCollaborator(isCollaboratorProject(project, userDoc.id));
  }, [project, userDoc]);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          console.log(`Fetching designs for budget: ${projectId}`); // Debug log
          await fetchProjectDesigns(projectId, setDesigns);
        } catch (error) {
          showToast("error", `Error fetching project designs: ${error.message}`);
        }
      }
    };

    fetchData();
  }, [user, projectId]);

  useEffect(() => {
    const fetchBudgetData = async () => {
      const budgetItems = {};
      try {
        for (const design of designs) {
          const result = await fetchVersionDetails(design, user);
          if (result.success) {
            const latestVersion = result.versionDetails[0];
            const budgetId = latestVersion?.budgetId;
            if (budgetId) {
              const fetchedBudget =
                userBudgets.find((b) => b.id === budgetId) ||
                budgets.find((b) => b.id === budgetId);
              if (fetchedBudget) {
                const fetchedItems = await Promise.all(
                  fetchedBudget.items.map(async (itemId) => {
                    const item =
                      userItems.find((i) => i.id === itemId) || items.find((i) => i.id === itemId);
                    return item || null;
                  })
                );
                budgetItems[design.id] = fetchedItems.filter((item) => item !== null);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching budget data:", error);
      }
      setDesignBudgetItems(budgetItems);
      setLoading(false);
    };

    if (designs.length > 0) {
      fetchBudgetData();
    } else {
      setLoading(false);
    }
  }, [designs, user, userBudgets, items, userItems, budgets]);

  const fetchDesignImage = (designId) => {
    if (!designId) {
      console.log("No design ID provided");
      return "";
    }

    const fetchedDesign =
      userDesigns.find((design) => design.id === designId) ||
      designs.find((design) => design.id === designId);
    if (!fetchedDesign || !fetchedDesign.history || fetchedDesign.history.length === 0) {
      return "";
    }

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

    return fetchedLatestDesignVersion.images[0].link || "";
  };

  useEffect(() => {
    const fetchDesignImages = async () => {
      const images = {};
      for (const design of designs) {
        const image = fetchDesignImage(design.id);
        images[design.id] = image;
      }
      setDesignImages(images);
    };

    const fetchItemImages = async () => {
      const images = {};
      for (const design of designs) {
        for (const item of designBudgetItems[design.id] || []) {
          const image = item.image || "/img/transparent-image.png";
          images[item.id] = image;
        }
      }
      setItemImages(images);
    };

    if (designs.length > 0) {
      fetchDesignImages();
      fetchItemImages();
    }
  }, [designs, designBudgetItems]);

  const totalProjectBudget = designs.reduce((total, design) => {
    const totalCost = designBudgetItems[design.id]?.reduce(
      (sum, item) => sum + parseFloat(item.cost.amount || 0) * (item.quantity || 1),
      0
    );
    return total + (totalCost || 0);
  }, 0);

  const handleValidation = (budgetAmount) => {
    let error = "";
    if (!budgetAmount || budgetAmount === 0) {
      error = "Budget is required";
    } else {
      const budgetAmountNum = parseFloat(budgetAmount);
      if (isNaN(budgetAmountNum)) {
        error = "Budget must be a number";
      } else if (budgetAmountNum <= 0) {
        error = "Budget must be greater than 0";
      } else if (budgetAmountNum > 999999999) {
        error = "Budget is too high";
      }
    }
    return error;
  };

  const handleUpdateBudget = async (budgetAmount, budgetCurrency) => {
    setIsBudgetButtonDisabled(true);
    setIsConfirmRemoveBudgetBtnDisabled(true);
    const error = handleValidation(budgetAmount);
    if (error !== "") {
      setError(error);
      setIsBudgetButtonDisabled(false);
      setIsConfirmRemoveBudgetBtnDisabled(false);
      return;
    } else {
      setError("");
    }

    try {
      const response = await updateProjectBudget(
        projectId,
        { amount: parseFloat(budgetAmount), currency: budgetCurrency },
        user
      );
      if (response.success) {
        if (!isEditingBudget) showToast("success", "Budget added successfully");
        setIsBudgetModalOpen(false);
        setProjectBudget({ amount: parseFloat(budgetAmount), currency: budgetCurrency });
      } else {
        throw new Error("Error adding budget");
      }
    } catch (error) {
      console.error("Error adding budget:", error);
      if (!isEditingBudget) showToast("error", "Failed to add budget");
    }
    setIsBudgetButtonDisabled(false);
    setIsConfirmRemoveBudgetBtnDisabled(false);
  };

  const handleRemoveBudget = async (budgetCurrency) => {
    setBudgetAmount(0);
    try {
      const response = await updateProjectBudget(
        projectId,
        { amount: 0, currency: budgetCurrency },
        user
      );
      if (response.success) {
        showToast("success", "Budget deleted successfully");
        setIsRemoveBudgetModalOpen(false);
        setProjectBudget({ amount: 0, currency: budgetCurrency });
      } else {
        throw new Error("Error deleting budget");
      }
    } catch (error) {
      console.error("Error deleting budget:", error);
      showToast("error", "Failed to delete budget");
    }
  };

  useEffect(() => {
    const fetchProjectBudgetData = async () => {
      try {
        const budget = await fetchProjectBudget(projectId);
        setProjectBudget(budget);
        console.log("Project budget:", budget);
      } catch (error) {
        console.error("Error fetching project budget:", error);
      }
    };

    if (projectId) {
      fetchProjectBudgetData();
    }
  }, [projectId]);

  useEffect(() => {
    const costs = {};
    let totalCostSum = 0;
    designs.forEach((design) => {
      const totalCost = designBudgetItems[design.id]?.reduce(
        (sum, item) => sum + parseFloat(item.cost.amount || 0) * (item.quantity || 1),
        0
      );
      costs[design.id] = totalCost?.toFixed(2) || "0.00";
      totalCostSum += totalCost || 0;
    });
    setTotalCosts(costs);
    setFormattedTotalCost(totalCostSum.toFixed(2));
  }, [designs, designBudgetItems]);

  const getBudgetColor = (budgetAmount, totalCost, isDarkMode) => {
    const parsedBudgetAmount = parseFloat(budgetAmount) || 0;
    const parsedTotalCost = parseFloat(totalCost) || 0;

    if (parsedBudgetAmount === 0) {
      return isDarkMode ? "var(--inputBg)" : "var(--bright-grey)"; // no budget
    } else if (parsedTotalCost <= parsedBudgetAmount) {
      return "var(--green)"; // within budget
    } else {
      return "var(--red)"; // over budget
    }
  };

  // Add this useEffect to compute total costs whenever designBudgetItems changes
  useEffect(() => {
    const computeTotalCosts = () => {
      const newTotalCosts = {};
      let projectTotal = 0;

      for (const designId in designBudgetItems) {
        const items = designBudgetItems[designId];
        if (!items) continue;

        const designTotal = items
          .filter((item) => item.includedInTotal !== false)
          .reduce((sum, item) => {
            const itemCurrency =
              item.cost?.currency?.currencySymbol ||
              item.cost?.currency?.currencyCode ||
              budgetCurrency?.currencySymbol ||
              "₱";
            return sum + parseFloat(item.cost?.amount || 0) * (item.quantity || 1);
          }, 0);

        newTotalCosts[designId] = {
          amount: designTotal,
          currency: items[0]?.cost?.currency || budgetCurrency || getPHCurrency(),
        };
        projectTotal += designTotal;
      }

      setTotalCosts(newTotalCosts);
      setFormattedTotalCost(projectTotal.toFixed(2));
    };

    computeTotalCosts();
  }, [designBudgetItems]);

  // Add this useEffect to fetch project budget and update in real-time
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (projectId) {
        try {
          const budgetData = await fetchProjectBudget(projectId);
          setProjectBudget(budgetData);
          if (budgetData?.budget) {
            setBudgetAmount(budgetData.budget.amount);
            setBudgetCurrency(budgetData.budget.currency || getPHCurrency());
          }
        } catch (error) {
          console.error("Error fetching budget:", error);
          showToast("error", "Failed to fetch budget data");
        }
      }
    };

    fetchBudgetData();
  }, [projectId]);

  // Add this useEffect to update budget amount and currency when projectBudget changes
  useEffect(() => {
    if (projectBudget?.budget) {
      setBudgetAmount(projectBudget.budget.amount);
      setBudgetCurrency(projectBudget.budget.currency || getPHCurrency());
      setBudgetAmountForInput(projectBudget.budget.amount.toString());
      setBudgetCurrencyForInput(projectBudget.budget.currency || getPHCurrency());
    }
  }, [projectBudget]);

  // Add a function to handle budget updates
  const handleBudgetUpdate = async () => {
    setIsBudgetButtonDisabled(true);
    try {
      const amount = parseFloat(budgetAmountForInput);
      if (isNaN(amount)) {
        setError("Please enter a valid amount");
        setIsBudgetButtonDisabled(false);
        return;
      }

      await updateProjectBudget(projectId, {
        amount: amount,
        currency: budgetCurrencyForInput,
      });

      setProjectBudget((prev) => ({
        ...prev,
        budget: {
          amount: amount,
          currency: budgetCurrencyForInput,
        },
      }));

      setBudgetAmount(amount);
      setBudgetCurrency(budgetCurrencyForInput);
      setIsBudgetModalOpen(false);
      showToast(
        "success",
        isEditingBudget ? "Budget updated successfully" : "Budget added successfully"
      );
    } catch (error) {
      console.error("Error updating budget:", error);
      setError("Failed to update budget");
      showToast(
        "error",
        `Failed to ${isEditingBudget ? "update" : "add"} budget. Please try again.`
      );
    } finally {
      setIsBudgetButtonDisabled(false);
    }
  };

  const renderBudgetStatus = () => {
    const totalCostNum = parseFloat(formattedTotalCost) || 0;
    const budgetAmountNum = parseFloat(projectBudget?.budget?.amount) || 0;
    const currencyCode = projectBudget?.budget?.currency?.currencyCode || "PHP";

    if (totalCostNum === 0 && budgetAmountNum === 0) {
      return "No costs or budget added";
    }

    const totalCostDisplay = (
      <>
        Total Cost:{" "}
        <strong>
          {currencyCode} {formattedTotalCost}
        </strong>
      </>
    );

    const budgetDisplay =
      budgetAmountNum > 0 ? (
        <>
          , Budget:{" "}
          <strong>
            {currencyCode} {formatNumber(budgetAmountNum)}
          </strong>
        </>
      ) : (
        ", No budget set"
      );

    return (
      <>
        {totalCostDisplay}
        {budgetDisplay}
      </>
    );
  };

  // Then in your JSX:
  <span
    className="priceSum budget"
    style={{
      backgroundColor: getBudgetColor(
        projectBudget?.budget?.amount,
        formattedTotalCost,
        isDarkMode
      ),
    }}
  >
    {renderBudgetStatus()}
  </span>;

  return (
    <ProjectSpace
      project={project}
      projectId={projectId}
      inDesign={false}
      inPlanMap={false}
      inTimeline={false}
      inBudget={true}
      changeMode={changeMode}
      setChangeMode={setChangeMode}
    >
      <div className="budgetHolder">
        <div className="previewBudgetCont" style={{ marginBottom: "20px" }}>
          <span
            className="priceSum budget"
            style={{
              backgroundColor: getBudgetColor(projectBudget.budget?.amount, totalCosts, isDarkMode),
            }}
          >
            {renderBudgetStatus()}
          </span>

          {isManagerContentManagerContributor &&
            (changeMode === "Managing Content" ||
              changeMode === "Managing" ||
              changeMode === "Contributing") && (
              <div style={{ display: "flex", gap: "5px" }}>
                {projectBudget?.budget?.amount > 0 ? (
                  <>
                    <IconButton onClick={() => handleOpenBudgetModal(true)} sx={iconButtonStyles}>
                      <EditIconSmallGradient />
                    </IconButton>

                    {isManagerContentManager &&
                      (changeMode === "Managing Content" || changeMode === "Managing") && (
                        <IconButton
                          onClick={() => {
                            setIsRemoveBudgetModalOpen(true);
                            setMenuOpen(false);
                          }}
                          sx={iconButtonStyles}
                        >
                          <DeleteIconGradient />
                        </IconButton>
                      )}
                  </>
                ) : (
                  <IconButton onClick={() => handleOpenBudgetModal(false)} sx={iconButtonStyles}>
                    <AddIconGradient />
                  </IconButton>
                )}
              </div>
            )}
        </div>

        <div className="allBudgetsCont">
          {loading ? (
            <Loading />
          ) : designs.length > 0 ? (
            designs.map((design) => {
              const totalCost = designBudgetItems[design.id]?.reduce(
                (sum, item) => sum + parseFloat(item.cost.amount || 0) * (item.quantity || 1),
                0
              );

              return (
                <div className="sectionBudget" key={design.id} style={{ flexDirection: "column" }}>
                  <div className="indivBudgetHeader">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="SubtitleBudget" style={{ fontSize: "1.4rem" }}>
                        {design.designName}
                      </span>
                      <span className="SubtitlePrice">Total Cost: Php {totalCosts[design.id]}</span>
                    </div>
                    <IconButton
                      onClick={() =>
                        navigate(`/budget/${design.id}`, {
                          state: { designId: design.id },
                        })
                      }
                      sx={{
                        ...iconButtonStyles,
                        height: "45px",
                        width: "45px",
                        padding: "10px 4px 10px 10px",
                        marginTop: "-6px",
                      }}
                    >
                      <ExportIcon />
                    </IconButton>
                  </div>
                  <div className="imageAndItems">
                    <div className="image-frame-project">
                      {/* Design Image */}
                      <img
                        src={designImages[design.id] || "/img/transparent-image.png"}
                        alt={`design preview `}
                        className="image-preview"
                        style={{ marginRight: "10px" }}
                      />
                    </div>
                    <div className="itemList">
                      {designBudgetItems[design.id]?.length > 0 ? (
                        designBudgetItems[design.id]?.map((item, index) => (
                          <>
                            <div className="item" key={item.id}>
                              {/* Item Image */}
                              <div className="item-frame-project">
                                <img
                                  src={itemImages[item.id] || "/img/transparent-image.png"}
                                  alt={`item preview `}
                                  style={{ width: "80px", height: "80px" }}
                                />
                              </div>
                              <div
                                style={{
                                  marginLeft: "12px",
                                  display: "flex",
                                  flexDirection: "column",
                                }}
                              >
                                <span className="SubtitleBudget">{item.itemName}</span>
                                <span
                                  className="SubtitlePrice"
                                  style={{ backgroundColor: "transparent" }}
                                >
                                  {item.cost?.currency?.currencyCode ||
                                    budgetCurrency?.currencyCode ||
                                    "₱"}{" "}
                                  {item.cost?.amount?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            {index < designBudgetItems[design.id].length - 1 && (
                              <div className="separator" style={{ margin: "5px 0px" }}></div>
                            )}
                          </>
                        ))
                      ) : (
                        <div className="placeholderDiv">
                          <img
                            src={`/img/design-placeholder${!isDarkMode ? "-dark" : ""}.png`}
                            style={{ width: "100px" }}
                            alt=""
                          />
                          <p className="grey-text center">No items added yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-content" style={{ height: "80vh" }}>
              <img
                src={`/img/design-placeholder${!isDarkMode ? "-dark" : ""}.png`}
                alt="No designs yet"
              />
              <p>No designs' budget yet.</p>
            </div>
          )}
        </div>
      </div>

      {isManagerContentManagerContributor &&
        (changeMode === "Managing Content" ||
          changeMode === "Managing" ||
          changeMode === "Contributing") && (
          <div className="circle-button-container">
            {menuOpen && (
              <div className="small-buttons">
                {projectBudget?.budget?.amount > 0 &&
                  isManagerContentManager &&
                  (changeMode === "Managing Content" || changeMode === "Managing") && (
                    <div
                      className="small-button-container budget"
                      onClick={() => {
                        setIsRemoveBudgetModalOpen(true);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="small-button-text">Delete Budget</span>
                      <div className="small-circle-button">
                        <DeleteIconWhite />
                      </div>
                    </div>
                  )}
                <div
                  className="small-button-container budget"
                  onClick={() => handleOpenBudgetModal(projectBudget?.budget?.amount > 0)}
                >
                  <span className="small-button-text">
                    {projectBudget?.budget?.amount > 0 ? "Edit the budget" : "Add a Budget"}
                  </span>
                  <div className="small-circle-button">
                    {projectBudget?.budget?.amount > 0 ? <EditIconWhite /> : <AddBudget />}
                  </div>
                </div>
              </div>
            )}
            <div className={`circle-button ${menuOpen ? "rotate" : ""} add`} onClick={toggleMenu}>
              {menuOpen ? <AddIcon /> : <AddIcon />}
            </div>
          </div>
        )}

      {isBudgetModalOpen && (
        <Dialog
          open={isBudgetModalOpen}
          onClose={() => toggleBudgetModal(false, isEditingBudget)}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
          sx={dialogStyles}
        >
          <DialogTitle sx={dialogTitleStyles}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "bold",
                fontSize: "1.15rem",
                flexGrow: 1,
                maxWidth: "80%",
                whiteSpace: "normal",
              }}
            >
              {isEditingBudget ? "Edit the budget" : "Add a Budget"}
            </Typography>
            <IconButton
              onClick={() => toggleBudgetModal(false, isEditingBudget)}
              sx={{
                ...iconButtonStyles,
                flexShrink: 0,
                marginLeft: "auto",
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </DialogTitle>
          <div style={{ wrap: "nowrap" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div className="input-group budget" style={{ marginTop: "12px", margin: "18px" }}>
                <div style={{ flexWrap: "nowrap", display: "flex" }}>
                  <CurrencySelect
                    selectedCurrency={budgetCurrencyForInput}
                    setSelectedCurrency={setBudgetCurrencyForInput}
                    currencyDetails={currencyDetails}
                  />
                  <TextField
                    id="item-price"
                    type="text"
                    placeholder="Enter item price"
                    value={budgetAmountForInput}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(value)) {
                        if (/^\d+$/.test(value)) {
                          value = value.replace(/^0+/, "");
                        }
                        setBudgetAmountForInput(value);
                      }
                    }}
                    sx={priceTextFieldStyles}
                    error={!!error}
                    helperText={error}
                    inputProps={{ ...textFieldInputProps, maxLength: 22 }}
                  />
                </div>
              </div>
              {error !== "" && (
                <div className="error-text" style={{ marginLeft: "20px" }}>
                  {error}
                </div>
              )}
            </div>
          </div>
          <DialogActions sx={{ ...dialogActionsStyles, marginTop: "0 !important" }}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleBudgetUpdate}
              sx={{
                ...gradientButtonStyles,
                opacity: isBudgetButtonDisabled ? "0.5" : "1",
                cursor: isBudgetButtonDisabled ? "default" : "pointer",
                "&:hover": {
                  backgroundImage: !isBudgetButtonDisabled && "var(--gradientButton)",
                },
              }}
              disabled={isBudgetButtonDisabled}
            >
              {isEditingBudget ? "Edit budget" : "Add Budget"}
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => toggleBudgetModal(false, isEditingBudget)}
              sx={outlinedButtonStyles}
              onMouseOver={(e) =>
                (e.target.style.backgroundImage =
                  "var(--lightGradient), var(--gradientButtonHover)")
              }
              onMouseOut={(e) =>
                (e.target.style.backgroundImage = "var(--lightGradient), var(--gradientButton)")
              }
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {isRemoveBudgetModalOpen && (
        <Dialog
          open={isRemoveBudgetModalOpen}
          onClose={() => setIsRemoveBudgetModalOpen(false)}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
          sx={dialogStyles}
        >
          <DialogTitle sx={dialogTitleStyles}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: "bold",
                fontSize: "1.15rem",
                flexGrow: 1,
                maxWidth: "80%",
                whiteSpace: "normal",
              }}
            >
              Confirm budget removal
            </Typography>
            <IconButton
              onClick={() => setIsRemoveBudgetModalOpen(false)}
              sx={{
                ...iconButtonStyles,
                flexShrink: 0,
                marginLeft: "auto",
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ ...dialogContentStyles, marginTop: "0 !important" }}>
            <span style={{ textAlign: "center", margin: "18px" }}>
              Are you sure you want to remove the budget?
            </span>
          </DialogContent>
          <DialogActions sx={{ ...dialogActionsStyles, marginTop: "0 !important" }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => handleRemoveBudget(budgetCurrency)}
              sx={{
                ...gradientButtonStyles,
                opacity: isConfirmRemoveBudgetBtnDisabled ? "0.5" : "1",
                cursor: isConfirmRemoveBudgetBtnDisabled ? "default" : "pointer",
                "&:hover": {
                  backgroundImage: !isConfirmRemoveBudgetBtnDisabled && "var(--gradientButton)",
                },
              }}
              disabled={isConfirmRemoveBudgetBtnDisabled}
            >
              Yes
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setIsRemoveBudgetModalOpen(false)}
              sx={outlinedButtonStyles}
              onMouseOver={(e) =>
                (e.target.style.backgroundImage =
                  "var(--lightGradient), var(--gradientButtonHover)")
              }
              onMouseOut={(e) =>
                (e.target.style.backgroundImage = "var(--lightGradient), var(--gradientButton)")
              }
            >
              No
            </Button>
          </DialogActions>
        </Dialog>
      )}
      <div className="bottom-filler" />
    </ProjectSpace>
  );
}

export default ProjBudget;

const priceTextFieldStyles = {
  input: { color: "var(--color-white)" },
  height: "fit-content",
  borderRadius: "10px",
  "& .MuiOutlinedInput-notchedOutline": {
    borderWidth: 2, // border thickness
  },
  "& .MuiOutlinedInput-root": {
    borderColor: "transparent",
    borderRadius: "10px",
    backgroundColor: "var(--nav-card-modal)",
    "& fieldset": {
      borderColor: "transparent",
      borderRadius: "10px",
    },
    "&:hover fieldset": {
      borderColor: "transparent",
    },
    "&.Mui-focused fieldset": {
      borderColor: "transparent",
    },
  },
  "& input": {
    color: "var(--color-white)",
    padding: "15px 16px 15px 10px",
  },
  "& .MuiFormHelperText-root": {
    color: "var(--color-quaternary)",
    textAlign: "left",
    marginLeft: 0,
    marginTop: "5px",
  },
};
