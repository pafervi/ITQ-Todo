// Rewrites the markdown-it link renderer so every rendered <a> opens in a new
// window. The description area in toDoModal uses markdown-it to render the
// task notes; without this patch, clicking a link in a note would replace the
// Electron window with the external page.
export default {
  renderBlankLinks(md) {
    let defaultRender =
      md.renderer.rules.link_open ||
      function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };

    md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
      let token = tokens[idx];
      let aIndex = token.attrIndex("target");
      if (aIndex < 0) {
        token.attrPush(["target", "_blank"]);
      } else {
        token.attrs[aIndex][1] = "_blank";
      }
      let rIndex = token.attrIndex("rel");
      if (rIndex < 0) {
        token.attrPush(["rel", "noopener noreferrer"]);
      } else {
        token.attrs[rIndex][1] = "noopener noreferrer";
      }
      return defaultRender(tokens, idx, options, env, self);
    };
  },
};
