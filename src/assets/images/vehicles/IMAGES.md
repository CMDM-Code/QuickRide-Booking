# Vehicle Image Asset Structure

All vehicle images should be placed in this directory structure:

```
src/assets/images/vehicles/
├── mitsubishi/
│   ├── mirage-gls-2025.png
│   ├── mirage-g4-glx-2022.png
│   ├── mirage-g4-glx-2024.png
│   └── mirage-g4-glx-2026.png
├── toyota/
│   ├── vios-xle-2024.jpg
│   └── vios-xle-2025.jpg
├── mg/
│   └── mg-1.5-style-2025.png
├── mazda/
│   └── da17-2024.png
└── suzuki/
    └── ertiga-hybrid-2023.png
```

To replace external images:
1.  Download the official images from manufacturer websites
2.  Place them in the corresponding brand directory
3.  Update the `FLEET_DATA` in `/src/lib/constants.ts` to use local paths: `/assets/images/vehicles/[brand]/[file]`

This structure:
- Organizes images by vehicle brand
- Maintains clear naming convention
- Allows for easy image updates and replacements
- Eliminates external dependencies
- Improves load performance
