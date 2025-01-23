// Server configurations for building test images
export const SERVER_CONFIG = {
  filesystem: {
    contextPath: '.',  // this path is relative to the servers repo
  },
  git: {
    contextPath: 'src/git',
  },
  fetch: {
    contextPath: 'src/fetch',
  }
};