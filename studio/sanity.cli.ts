import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: 'dldhzjbv',
    dataset: 'production',
  },
  // 편집 화면 주소: https://mrmr.sanity.studio
  studioHost: 'mrmr',
  deployment: {
    appId: 'tzo7eh4tvhsaot2u23mt6vxm',
    autoUpdates: true,
  },
});
