import { useState, useCallback, useEffect } from "react";

export const useSamCanvas = (
  canvasRef,
  previewCanvasRef,
  color,
  opacity,
  setConfirmSamMaskChangeModalOpen,
  selectedSamMask,
  samMasks,
  samMaskImage,
  setSamMaskMask,
  showPreview
) => {
  console.log("useSamCanvas values:", { color, opacity, canvasRef, previewCanvasRef });
  const applySAMMaskStyling = useCallback(() => {
    console.log("Applying styling with:", { color, opacity });

    let colorHex = color;
    if (colorHex === "var(--samMask)") colorHex = "#7543ff";

    // Handle main canvas
    if (!canvasRef.current) {
      console.log("No canvas ref");
      return;
    }
    const samImage = canvasRef.current?.querySelector("img");
    console.log("Sam Image:", samImage);
    if (samImage) {
      samImage.style.filter = `drop-shadow(0px 1000px 0px rgba(${hexToRgb(colorHex)}, ${opacity}))`;
    }

    // Handle preview canvas
    if (!previewCanvasRef.current) {
      console.log("No preview ref");
      return;
    }
    const previewImage = previewCanvasRef.current?.querySelector("img");
    if (showPreview && previewImage) {
      console.log("Preview Image:", previewImage);
      previewImage.style.filter = `drop-shadow(0px 1000px 0px rgba(${hexToRgb(
        colorHex
      )}, ${opacity}))`;
    }
  }, [canvasRef, previewCanvasRef, color, opacity, showPreview]);

  // Hex to RGB conversion function
  const hexToRgb = (hex) => {
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });
    let bigint = parseInt(hex.slice(1), 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return `${r},${g},${b}`;
  };

  // update the mask path input and display the selected mask
  const actualUseSelectedMask = useCallback(
    (selectedSamMask) => {
      const samMaskImage = new Image();
      samMaskImage.src = selectedSamMask["mask"];
      const maskSrc = selectedSamMask["masked"];
      console.log("Selected Mask Source:", maskSrc);
      setSamMaskMask(maskSrc);
      samMaskImage.onload = function () {
        applySAMMaskStyling(); // Apply color and opacity styling
      };
    },
    [applySAMMaskStyling, setSamMaskMask]
  );

  const useSelectedMask = useCallback(
    (selectedSamMask) => {
      if (selectedSamMask) {
        const masks = samMasks.map((samMask) => samMask["mask"]);

        // Check if the input value is not empty
        if (samMaskImage) {
          // Check if the value does not match any mask in the masks array
          const isValueInMasks = masks.includes(samMaskImage);

          // If the current value is not in masks, show confirmation dialog
          if (!isValueInMasks) {
            setConfirmSamMaskChangeModalOpen(true);
            return;
          }
        }
        actualUseSelectedMask(selectedSamMask); // also if yes in modal
      } else {
        console.log("No selected SAM mask found.");
      }
    },
    [actualUseSelectedMask, samMaskImage, samMasks, setConfirmSamMaskChangeModalOpen]
  );

  return {
    applySAMMaskStyling,
    useSelectedMask,
    actualUseSelectedMask,
  };
};
