module.exports = {
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      customFileProtocol: './',
      builderOptions: {
        appId: "itq-todo.local",
        productName: "ITQ Todo",
        // Never publish from here; installers are built locally.
        publish: null,
        linux: {
          category: "Office;ProjectManagement",
          description: "Personal planner and lab notebook for computational catalysis research at ITQ (UPV-CSIC).",
          synopsis: "Personal planner for computational research",
          executableName: "itq-todo",
          // AppImage = portable single file; deb = regular install (Debian/Ubuntu).
          // rpm needs rpmbuild and pacman needs libarchive on the build machine;
          // add them back here only if those distros are needed.
          target: ["AppImage", "deb"],
          icon: "build/linux-icons",
        },
        deb: {
          packageName: "itq-todo",
          artifactName: "itq-todo_${version}_amd64.deb",
        },
        appImage: {
          artifactName: "ITQ-Todo-${version}.AppImage",
        },
        win: {
          target: ["nsis", "portable"],
        },
        mac: {
          category: "public.app-category.productivity",
          target: ["dmg", "pkg"],
        },
      },
    },
  }
};
