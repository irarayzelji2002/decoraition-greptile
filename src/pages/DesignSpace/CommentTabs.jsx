import React, { useState, useEffect, useRef } from "react";
import { Tabs, Tab, Select, MenuItem, IconButton, Box, Button } from "@mui/material";
import {
  ArrowForwardIosRounded as ArrowForwardIosRoundedIcon,
  ArrowBackIosRounded as ArrowBackIosRoundedIcon,
  KeyboardArrowDownRounded as KeyboardArrowDownRoundedIcon,
} from "@mui/icons-material";
import CommentContainer from "./CommentContainer";
import { toggleComments } from "./backend/DesignActions";
import { set } from "lodash";
import { useSharedProps } from "../../contexts/SharedPropsContext";

function CommentTabs({
  workingAreaRef,
  numImageFrames,
  showComments,
  setShowComments,
  width,
  setWidth,
  prevWidth,
  setPrevWidth,
  prevHeight,
  setPrevHeight,
  design,
  designVersion,
  designVersionImages,
}) {
  const { user, userDoc, userComments, userReplies, userDesignComments } = useSharedProps();
  const [commentForTab, setCommentForTab] = useState(true); // true for All Comments, false for For You
  const [commentTypeTab, setCommentTypeTab] = useState(true); // true for Open, false for Resolved
  // userDesignComments & userComments for the designs's latest deisgn version
  const [designComments, setDesignComments] = useState([]);
  const [userOwnedComments, setUserOwnedComments] = useState([]);
  const [userOwnedReplies, setUserOwnedReplies] = useState([]);

  const [isAddCommentOpen, setIsAddCommentOpen] = useState(false);
  const [activeComment, setActiveComment] = useState("");

  const [isLess600, setIsLess600] = useState(false);

  const handleCommentForTabChange = () => {
    setCommentForTab(!commentForTab);
  };

  const handleCommentTypeTabChange = () => {
    setCommentTypeTab(!commentTypeTab);
  };

  const [height, setHeight] = useState("100%");
  const [applyMinHeight, setApplyMinHeight] = useState(true);
  const resizeFactor = 2;
  const commentSectionRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const resizeHandleHeightRef = useRef(null);
  const commentSectionIconButtonRef = useRef(null);

  // Effect for adjusting the promptBar width on drag
  useEffect(() => {
    const promptBar = commentSectionRef.current;
    const resizeHandle = resizeHandleRef.current;
    if (!promptBar || !resizeHandle) return;

    promptBar.style.width = `${width}px`;

    const handleMouseDown = (e) => {
      e.preventDefault();
      if (window.innerWidth <= 600) {
        promptBar.style.width = "auto";
        setIsLess600(true);
        return;
      } else setIsLess600(false);

      const initialX = e.clientX;
      const handleMouseMove = (e) => {
        const deltaX = initialX - e.clientX;
        const newWidth = width + resizeFactor * deltaX;
        if (newWidth > 0) {
          setWidth(newWidth);
        }
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    };

    resizeHandleRef.current.addEventListener("mousedown", handleMouseDown);

    const handleResize = () => {
      if (window.innerWidth <= 600) {
        promptBar.style.width = "auto";
        setIsLess600(true);
      } else {
        promptBar.style.width = `${width}px`;
        setIsLess600(false);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (resizeHandle.current) {
        resizeHandleRef.current.removeEventListener("mousedown", handleMouseDown);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [width]);

  // Effect for adjusting the promptBar height on drag
  useEffect(() => {
    const promptBar = commentSectionRef.current;
    const resizeHandleHeight = resizeHandleHeightRef.current;
    if (!promptBar || !resizeHandleHeight) return;

    promptBar.style.height = `${height}px`;

    // Handle resizing on mousedown and drag
    const handleMouseDownHeight = (e) => {
      e.preventDefault();
      console.log("Mouse down detected on resize handle");
      const startY = e.clientY;
      const startHeight = promptBar.getBoundingClientRect().height;

      const handleMouseMoveHeight = (e) => {
        const deltaY = startY - e.clientY;
        let newHeight = startHeight + deltaY;
        console.log(
          `Mouse move detected. StartY: ${startY}, CurrentY: ${e.clientY}, deltaY: ${deltaY}, newHeight: ${newHeight}`
        );

        // Adjust height
        if (window.innerWidth <= 600) {
          const initHeight = window.innerHeight - 154;
          if (newHeight >= initHeight) {
            newHeight = initHeight;
            // console.log("Max height reached, setting height to 100%");
          } else if (newHeight < 0) {
            newHeight = 0;
            // console.log("Min height reached, setting height to 0");
          }
          setHeight(`${newHeight}px`);
          promptBar.style.height = `${newHeight}px`;
        } else {
          setHeight("auto");
          promptBar.style.height = "auto";
        }
      };

      const handleMouseUpHeight = () => {
        console.log("Mouse up detected, removing mousemove and mouseup listeners");
        window.removeEventListener("mousemove", handleMouseMoveHeight);
        window.removeEventListener("mouseup", handleMouseUpHeight);
      };

      window.addEventListener("mousemove", handleMouseMoveHeight);
      window.addEventListener("mouseup", handleMouseUpHeight);
    };

    resizeHandleHeight.addEventListener("mousedown", handleMouseDownHeight);

    // Handle screen resize adjustments
    const handleResizeHeight = () => {
      if (window.innerWidth <= 600) {
        promptBar.style.height = `${height}px`;
      } else {
        promptBar.style.height = "100%";
      }
    };
    window.addEventListener("resize", handleResizeHeight);

    return () => {
      resizeHandleHeight.removeEventListener("mousedown", handleMouseDownHeight);
      window.removeEventListener("resize", handleResizeHeight);
    };
  }, [height]);

  useEffect(() => {
    const promptBar = commentSectionRef.current;
    if (!promptBar) return;
    setWidth(prevWidth ?? width);
    setHeight(prevHeight ?? height);

    if (window.innerWidth <= 600) {
      promptBar.style.width = "auto";
    } else {
      promptBar.style.width = `${prevWidth ?? width}`;
    }

    if (window.innerWidth <= 600) {
      promptBar.style.height = `${prevHeight ?? height}`;
    } else {
      promptBar.style.height = "100%";
    }
  }, [showComments]);

  // Check height on component mount and on numImageFrames change
  useEffect(() => {
    const checkWorkingAreaHeight = () => {
      if (workingAreaRef.current) {
        const workingAreaHeight = workingAreaRef.current.offsetHeight;
        if (workingAreaHeight + 154 > window.innerHeight) {
          setApplyMinHeight(false);
        } else {
          setApplyMinHeight(true);
        }
      }
    };

    checkWorkingAreaHeight();
  }, [numImageFrames]);

  const [isWrapped, setIsWrapped] = useState(false);
  const adjustPillStyle = () => {
    const commentTabsHeader = document.querySelector(".pairTabs");
    setIsWrapped(commentTabsHeader?.offsetWidth < 220);
  };

  useEffect(() => {
    adjustPillStyle();
    window.addEventListener("resize", adjustPillStyle);
    return () => {
      window.removeEventListener("resize", adjustPillStyle);
    };
  }, [width]);

  useEffect(() => {
    if (
      dummyUserDesignComments &&
      dummyUserDesignComments?.length > 0 &&
      dummyUserComments &&
      dummyUserComments?.length > 0
    ) {
      setDesignComments(dummyUserDesignComments);
      setUserOwnedComments(dummyUserComments);
      setUserOwnedReplies(dummyUserOwnedReplies);
      return;
    }

    if (designVersion) {
      // Get all imageIds from the current designVersion
      const designVersionImageIds = designVersion.images.map((img) => img.imageId);

      // Filter comments that belong to the current designVersion's images
      const filteredDesignComments = userDesignComments.filter((comment) =>
        designVersionImageIds.includes(comment.designVersionImageId)
      );
      setDesignComments(filteredDesignComments);

      // Filter user's own comments from the filtered design comments
      const filteredUserComments = userComments.filter((comment) =>
        designVersionImageIds.includes(comment.designVersionImageId)
      );
      setUserOwnedComments(filteredUserComments);

      // Filter user's replies that exist in any of the design comments
      const userRepliesInDesign = userReplies.filter((reply) => {
        return filteredDesignComments.some((comment) =>
          comment.replies?.some((r) => r.replyId === reply.id)
        );
      });
      setUserOwnedReplies(userRepliesInDesign);
    }
  }, [designVersion, userComments, userReplies, userDesignComments]);

  return (
    <div className="comment-section" ref={commentSectionRef}>
      <div className={window.innerWidth > 600 ? "resizeHandle left" : ""} ref={resizeHandleRef}>
        <div className={window.innerWidth > 600 ? "resizeHandleChildDiv" : ""}>
          <div className={window.innerWidth > 600 ? "sliderIndicator" : ""}></div>
        </div>
      </div>
      <div
        className={window.innerWidth <= 600 ? "resizeHandle height" : ""}
        ref={resizeHandleHeightRef}
      >
        <div className={window.innerWidth <= 600 ? "resizeHandleChildDiv" : ""}>
          <div className={window.innerWidth <= 600 ? "sliderIndicator" : ""}></div>
        </div>
      </div>
      {isLess600 && (
        <IconButton
          sx={{
            color: "var(--color-white)",
            position: "absolute",
            borderRadius: "50%",
            right: "8px",
            top: "8px",
            marginTop: "9px",
            marginRight: "20px",
            zIndex: "1200",
            "&:hover": {
              backgroundColor: "var(--iconButtonHover)",
            },
            "& .MuiTouchRipple-root span": {
              backgroundColor: "var(--iconButtonActive)",
            },
          }}
          onClick={() => {
            setPrevWidth(width);
            setPrevHeight(height);
            toggleComments(setShowComments);
          }}
          className="commentSectionIconButtonInside"
        >
          <ArrowBackIosRoundedIcon
            sx={{
              color: "var(--color-white) !important",
              transform: showComments ? "rotate(270deg)" : "rotate(90deg)",
            }}
          />
        </IconButton>
      )}
      <Box
        sx={{ minHeight: applyMinHeight ? "calc(100vh - 259px)" : "688px" }}
        className="transitionMinHeight"
      >
        <div className="comment-tabs-header">
          {/* <IconButton onClick={handleCloseComments} className="close-icon-button">
          <CloseIcon sx={{ color: "var(--color-white)" }} />
        </IconButton> */}

          {/* Comment Tabs */}
          <div className="commentTabsContainer">
            <div className="pairTabs">
              <Tabs
                value={commentForTab ? 0 : 1}
                onChange={handleCommentForTabChange}
                sx={{
                  minHeight: "40px",
                  "& .MuiTabs-flexContainer": {
                    gap: 0,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  },
                }}
                TabIndicatorProps={{ style: { display: "none" } }} // Hide default indicator
              >
                <Tab label="All Comments" sx={getPillTabStyle(isWrapped, commentForTab, 0)} />
                <Tab label="For You" sx={getPillTabStyle(isWrapped, commentForTab, 1)} />
              </Tabs>
            </div>
            <div className="pairTabs">
              <Tabs
                value={commentTypeTab ? 0 : 1}
                onChange={handleCommentTypeTabChange}
                sx={{
                  minHeight: "40px",
                  "& .MuiTabs-flexContainer": {
                    gap: 0,
                    flexWrap: "wrap",
                    justifyContent: "center",
                  },
                }}
                TabIndicatorProps={{ style: { display: "none" } }} // Hide default indicator
              >
                <Tab label="Open" sx={getPillTabStyle(isWrapped, commentTypeTab, 0)} />
                <Tab label="Resolved" sx={getPillTabStyle(isWrapped, commentTypeTab, 1)} />
              </Tabs>
            </div>
          </div>
        </div>

        {/* Comments container */}
        <CommentContainer
          commentId={"1"}
          username={"Juan Dela Cruz"}
          date={"June 17, 2024"}
          comment={"I like the room design! Could we add some more table sheets?"}
          hasTextBox={true}
          replyCount={0}
          replyLatestDate={"June 20, 2024"}
          setActiveComment={setActiveComment}
        />
      </Box>

      {/* Add a comment button */}
      <Box sx={{ margin: "0px 20px 0px 20px" }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => setIsAddCommentOpen(true)}
          sx={{
            color: "white",
            mt: 3,
            mb: 2,
            backgroundImage: "var(--gradientButton)",
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: "bold",
            "&:hover": {
              backgroundImage: "var(--gradientButtonHover)",
            },
          }}
        >
          Add a comment
        </Button>
      </Box>
    </div>
  );
}

export default CommentTabs;

const getPillTabStyle = (isWrapped, selectedTab, index) => {
  const isSelected = (selectedTab && index === 0) || (!selectedTab && index === 1);
  return {
    px: "5px", // Padding for the pill shape
    paddingLeft: index === 0 ? "10px" : "5px",
    paddingRight: index === 0 ? "5px" : "10px",
    py: 0,
    textTransform: "none",
    borderRadius: !isWrapped
      ? index === 0
        ? "20px 0px 0px 20px"
        : "0px 20px 20px 0px" // Left or Right rounded
      : index === 0
      ? "20px 20px 0 0"
      : "0 0 20px 20px", // Top or Bottom rounded
    fontWeight: "bold",
    transition: "background-color 0.3s, color 0.3s",
    backgroundColor: isSelected ? "var(--brightFont)" : "transparent",
    color: isSelected ? "var(--color-white)" : "var(--color-white)", // Set selected color here
    border: isSelected ? "none" : "1.5px solid var(--brightFont)",
    "&:hover": {
      backgroundColor: isSelected ? "var(--brightFont)" : "rgba(0,0,0,0.05)",
    },
    "&.Mui-selected": {
      color: isSelected ? "var(--color-white)" : "var(--color-white)",
    },
    minHeight: "40px",
    width: "110px", // Ensures tabs are the same size
  };
};

// Comments for the design version
const dummyUserDesignComments = [
  {
    id: "comment1",
    designVersionImageId: "image123",
    userId: "userA",
    message: "This is the first comment.",
    mentions: ["userB", "userC"],
    status: false,
    createdAt: new Date("2024-10-01T10:00:00Z"),
    modifiedAt: new Date("2024-10-01T12:00:00Z"),
    replies: [
      {
        replyId: "reply1_1",
        userId: "userB",
        message: "This is a reply to the first comment.",
        mentions: ["userA"],
        createdAt: new Date("2024-10-01T11:00:00Z"),
        modifiedAt: new Date("2024-10-01T11:30:00Z"),
        replies: ["reply1_1_1"],
      },
      {
        replyId: "reply1_2",
        userId: "userC",
        message: "Another reply to the first comment.",
        mentions: [],
        createdAt: new Date("2024-10-01T11:15:00Z"),
        modifiedAt: new Date("2024-10-01T11:45:00Z"),
        replies: [],
      },
    ],
  },
  {
    id: "comment2",
    designVersionImageId: "image456",
    userId: "userB",
    message: "This is the second comment.",
    mentions: [],
    status: true,
    createdAt: new Date("2024-10-02T09:30:00Z"),
    modifiedAt: new Date("2024-10-02T10:30:00Z"),
    replies: [
      {
        replyId: "reply2_1",
        userId: "userA",
        message: "Replying to the second comment.",
        mentions: ["userB"],
        createdAt: new Date("2024-10-02T10:00:00Z"),
        modifiedAt: new Date("2024-10-02T10:20:00Z"),
        replies: ["reply2_1_1"],
      },
    ],
  },
  {
    id: "comment3",
    designVersionImageId: "image789",
    userId: "userC",
    message: "This is the third comment.",
    mentions: ["userA"],
    status: false,
    createdAt: new Date("2024-10-03T14:00:00Z"),
    modifiedAt: new Date("2024-10-03T14:30:00Z"),
    replies: [],
  },
  {
    id: "comment4",
    designVersionImageId: "image789",
    userId: "userA",
    message: "This is the fourth comment.",
    mentions: [],
    status: false,
    createdAt: new Date("2024-10-03T14:00:00Z"),
    modifiedAt: new Date("2024-10-03T14:30:00Z"),
    replies: [],
  },
];

// User's own comments (assuming current user is "userA")
const dummyUserComments = dummyUserDesignComments.filter((comment) => comment.userId === "userA");

// User's own replies (assuming current user is "userA")
const dummyUserOwnedReplies = dummyUserDesignComments.flatMap((comment) =>
  comment.replies
    .filter((reply) => reply.userId === "userA")
    .map((reply) => ({
      id: reply.replyId,
      commentId: comment.id,
      ...reply,
    }))
);

// const dummyUserDesignComments=[];
// const dummyUserComments = [];
// const dummyUserOwnedReplies = [];
