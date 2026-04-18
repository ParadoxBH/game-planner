import { Grid, Stack } from "@mui/material";
import type { ReactNode } from "react";
import React from "react";
import { usePlatform } from "../../hooks/usePlatform";

interface DetainContainerProps {
  children?: ReactNode;
}

export function DetainContainer({ children }: DetainContainerProps) {
  const childrenArray = React.Children.toArray(children);
  const detain = childrenArray[0];
  const others = childrenArray.slice(1);
  const { isMobile } = usePlatform();
  const sizeItemCard = 300;

  return (
    <Stack 
      direction={isMobile ? "column" : "row"} 
      spacing={isMobile ? 1 : 2} 
      flex={1} 
      sx={{ 
        overflowX: "hidden", 
        overflowY: isMobile ? "visible" : "hidden",
        minHeight: 0
      }}
    >
      <Stack
        spacing={2}
        sx={isMobile ? undefined : {
          overflowY: "auto",
          overflowX: "hidden",
          maxWidth: sizeItemCard,
          minWidth: sizeItemCard,
        }}
      >
        {detain}
      </Stack>
      <Stack 
        spacing={2} 
        overflow={isMobile ? "visible" : "auto"} 
        flex={1}
        sx={{ minWidth: 0 }}
      >
        <Grid container spacing={1}>
          {others}
        </Grid>
      </Stack>
    </Stack>
  );
}
