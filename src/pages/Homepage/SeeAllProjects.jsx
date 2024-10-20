import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSharedProps } from "../../contexts/SharedPropsContext.js";
import SearchAppBar from "./SearchAppBar.jsx";
import { handleDeleteProject } from "./backend/HomepageActions.jsx";
import Dropdowns from "../../components/Dropdowns.jsx";
import ProjectOptionsHome from "../../components/ProjectOptionsHome.jsx";
import "../../css/homepage.css";
import "../../css/seeAll.css";

export default function SeeAllProjects() {
  const navigate = useNavigate();
  const { user, setUser, projects, setProjects, designs, setDesigns } = useSharedProps();

  const [searchQuery, setSearchQuery] = useState("");
  const [lastVisible, setLastVisible] = useState(null);
  const [page, setPage] = useState(1);
  const [isLastPage, setIsLastPage] = useState(false);
  const [totalPages, setTotalPages] = useState(5);

  // const fetchDesigns = (userId, page) => {
  //   const designsRef = collection(db, "projects");
  //   let q = query(designsRef, where("createdBy", "==", userId), limit(10)); // Fetch 10 designs per page

  //   if (page > 1 && lastVisible) {
  //     q = query(
  //       designsRef,
  //       where("createdAt", ">", new Date(0)),
  //       startAfter(lastVisible),
  //       limit(10)
  //     );
  //   }

  //   const unsubscribeDesigns = onSnapshot(q, (querySnapshot) => {
  //     const designList = [];
  //     querySnapshot.forEach((doc) => {
  //       designList.push({ id: doc.id, ...doc.data() });
  //     });
  //     setDesigns(designList);
  //     setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
  //     setIsLastPage(querySnapshot.size < 10); // If fewer than 10 results, it's the last page
  //   });

  //   return () => unsubscribeDesigns();
  // };

  const handlePageClick = (pageNumber) => {
    setPage(pageNumber);
    // fetchDesigns(user.uid, pageNumber);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      handlePageClick(page - 1);
    }
  };

  const handleNextPage = () => {
    if (!isLastPage) {
      handlePageClick(page + 1);
    }
  };

  const filteredDesigns = projects.filter((projects) =>
    projects.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <SearchAppBar onSearchChange={(value) => setSearchQuery(value)} user={user} />
      <div className="bg">
        <div className="dropdown-container">
          <Dropdowns />
        </div>

        <div className="title">Projects</div>
        <section className="recent-section">
          <div className="recent-designs">
            <div className="layout">
              {filteredDesigns.length > 0 ? (
                filteredDesigns.map((project) => (
                  <ProjectOptionsHome
                    key={project.id}
                    name={project.projectName}
                    projectId={project.id}
                    onDelete={() =>
                      handleDeleteProject(user.uid, project.id, navigate, setProjects)
                    }
                    onOpen={() =>
                      navigate(`/project/${project.id}`, {
                        state: { projectId: project.id },
                      })
                    }
                  />
                ))
              ) : (
                <div className="no-content">
                  <img src="/img/design-placeholder.png" alt="No designs yet" />
                  <p>No designs yet. Start creating.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pagination Section */}
        <div className="pagination-controls">
          {/* Previous Page Button */}
          <button onClick={handlePreviousPage} className="pagination-arrow" disabled={page === 1}>
            &lt;
          </button>

          {/* Map over an array to create pagination buttons */}
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index + 1}
              className={`pagination-button ${page === index + 1 ? "active" : ""}`}
              onClick={() => handlePageClick(index + 1)}
            >
              {index + 1}
            </button>
          ))}

          {/* Next Page Button */}
          <button onClick={handleNextPage} className="pagination-arrow" disabled={isLastPage}>
            &gt;
          </button>
        </div>
      </div>
    </>
  );
}
