import { useState, useCallback, useEffect } from "react";

export const useSamCanvas = (
  canvasRef,
  color,
  opacity,
  setConfirmSamMaskChangeModalOpen,
  selectedSamMask,
  samMasks,
  samMaskImage,
  setSamMaskMask
) => {
  const applySAMMaskStyling = useCallback(
    (color, opacity) => {
      const samImage = canvasRef.querySelector("img");
      if (samImage) {
        samImage.style.filter = `drop-shadow(0px 1000px 0px rgba(${hexToRgb(color)}, ${opacity}))`;
      }
    },
    [canvasRef]
  );

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
      const samMaskImage = selectedSamMask["mask"];
      const maskSrc = selectedSamMask["masked_image"];
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
    useSelectedMask,
    actualUseSelectedMask,
  };
};
