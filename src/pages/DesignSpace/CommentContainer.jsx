import React, { useState, useEffect, useRef } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Button,
  MenuItem,
  ListItemIcon,
  ListItemText,
  styled,
} from "@mui/material";
import { FaCheckCircle, FaEllipsisV, FaAt } from "react-icons/fa";
import {
  CheckRounded as CheckRoundedicon,
  MoreVert as MoreVertIcon,
  UnfoldMoreRounded as UnfoldMoreRoundedIcon,
  UnfoldLessRounded as UnfoldLessRoundedIcon,
} from "@mui/icons-material";
import { stringAvatarColor, stringAvatarInitials } from "../../functions/utils.js";
import { useSharedProps } from "../../contexts/SharedPropsContext.js";
import { iconButtonStylesBrighter } from "../Homepage/DrawerComponent.jsx";
import { formatDateDetail, getUser } from "../Homepage/backend/HomepageActions.jsx";
import { DeleteIcon, EditIcon } from "../../components/svg/DefaultMenuIcons.jsx";

const CustomMenuItem = styled(MenuItem)({
  minHeight: "2.6rem !important",
  "&:hover": {
    backgroundColor: "var(--iconBg)",
  },
  "&:focus": {
    backgroundColor: "var(--iconBg)",
  },
});

const CommentContainer = ({
  comment,
  optionsState,
  setOptionsState = () => {},
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
  selectedId = "",
  setSelectedId = () => {},
}) => {
  const { user, userDoc } = useSharedProps();
  const [commentId, setCommentId] = useState("");
  const [commenterUserId, setCommenterUserId] = useState("");
  const [username, setUsername] = useState("");
  const [date, setDate] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyCount, setReplyCount] = useState(0);
  const [replyLatestDate, setReplyLatestDate] = useState("");

  const [isEditingComment, setIsEditingComment] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const getUserData = async () => {
    const result = await getUser(comment.userId);
    if (result.success) {
      const userDoc = result.user;
      setUsername(userDoc.username);
      setProfilePic(userDoc.profilePic);
    } else console.error("User not found for comment");
  };
  const optionsRef = useRef(null);

  useEffect(() => {
    if (!comment) return;
    getUserData();
    setCommentId(comment.id);
    setCommenterUserId(comment.userId);
    setCommentContent(comment.message);
    setDate(formatDateDetail(comment.createdAt));
    setReplyCount(comment.replies?.length || 0);
    setReplyLatestDate(
      comment.replies?.length > 0
        ? formatDateDetail(
            comment.replies.reduce((latest, reply) => {
              const replyTime = reply.createdAt.seconds * 1000 + reply.createdAt.nanoseconds / 1e6;
              const latestTime = latest.seconds * 1000 + latest.nanoseconds / 1e6;
              return replyTime > latestTime ? reply.createdAt : latest;
            }, comment.replies[0].createdAt)
          )
        : ""
    );
  }, [comment]);

  const setEditingState = () => {
    setIsEditingComment(true);
    toggleOptions(commentId);
  };

  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
    toggleOptions(commentId);
  };

  return (
    <div
      className={`comment-container ${selectedId === commentId && "active"}`}
      onClick={() => {
        console.log("parent clicked");
        setSelectedId(commentId);
      }}
    >
      <div className="profile-section">
        <div className="profile-info">
          <Box
            sx={{
              width: 39,
              height: 39,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--gradientButton)",
              borderRadius: "50%",
              padding: "3px",
              marginRight: "10px",
              cursor: "auto",
            }}
          >
            <Avatar
              src={profilePic ? profilePic : ""}
              sx={{
                height: 39,
                width: 39,
                borderRadius: "50%",
                boxShadow: "0 0 0 3px var(--gradientButton)",
                "& .MuiAvatar-img": {
                  borderRadius: "50%",
                },
                ...stringAvatarColor(username),
              }}
              children={stringAvatarInitials(username)}
            />
          </Box>
          <div className="user-details">
            <span className="username" onClick={(e) => e.stopPropagation()}>
              {username}
            </span>
            <span
              style={{ fontSize: "0.7rem" }}
              className="date"
              onClick={(e) => e.stopPropagation()}
            >
              {date}
            </span>
          </div>
        </div>
        <div className="profile-status">
          <IconButton
            sx={{ ...iconButtonStylesBrighter, padding: "3.2px", marginRight: "5px" }}
            onClick={(e) => {
              e.stopPropagation();
              console.log("child clicked");
            }}
          >
            <CheckRoundedicon sx={{ color: "var(--comment-capsule)", transform: "scale(1.2)" }} />
          </IconButton>
          <IconButton
            sx={{ ...iconButtonStylesBrighter, padding: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            {!isExpanded ? (
              <UnfoldMoreRoundedIcon
                sx={{ fontSize: "1.9rem", color: "var(--color-white)", transform: "scale(0.9)" }}
              />
            ) : (
              <UnfoldLessRoundedIcon
                sx={{ fontSize: "1.9rem", color: "var(--color-white)", transform: "scale(0.9)" }}
              />
            )}
          </IconButton>
          {commenterUserId === userDoc.id && (
            <>
              <IconButton
                sx={{ ...iconButtonStylesBrighter, padding: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("child2 clicked");
                }}
              >
                <MoreVertIcon
                  sx={{ fontSize: "1.9rem", color: "var(--color-white)", transform: "scale(0.9)" }}
                />
              </IconButton>
              <div
                ref={optionsRef}
                className="dropdown-menu comment"
                style={{
                  position: "absolute",
                  top: "0",
                  marginTop: "10px",
                }}
                onClick={() => toggleOptions(commentId)}
              >
                <CustomMenuItem
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingState();
                  }}
                >
                  <ListItemIcon>
                    <EditIcon className="icon" />
                  </ListItemIcon>
                  <ListItemText primary="Edit" sx={{ color: "var(--color-white)" }} />
                </CustomMenuItem>
                <CustomMenuItem
                  className="dropdown-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteModal();
                  }}
                >
                  <ListItemIcon>
                    <DeleteIcon className="icon" />
                  </ListItemIcon>
                  <ListItemText primary="Delete" sx={{ color: "var(--color-white)" }} />
                </CustomMenuItem>
              </div>
            </>
          )}
        </div>
      </div>
      <p style={{ cursor: "auto" }} onClick={(e) => e.stopPropagation()}>
        {commentContent}
      </p>
      {!isExpanded ? (
        <div className="replies-details">
          <span style={{ cursor: "auto" }} onClick={(e) => e.stopPropagation()}>
            {replyCount === 0
              ? "No replies"
              : replyCount === 1
              ? "1 reply"
              : replyCount > 1 && `${replyCount} replies`}
          </span>
          {replyCount > 0 && <span className="gradient-bullet"></span>}
          <span style={{ cursor: "auto" }} onClick={(e) => e.stopPropagation()}>
            {replyLatestDate}
          </span>
        </div>
      ) : (
        <div className="reply-input">
          <FaAt className="at-symbol" />
          <input type="text" placeholder="Add a Reply" />
        </div>
      )}
    </div>
  );
};

export default CommentContainer;
