import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export const pathsPlugin = {
  name: 'path-mapping',
  setup(build) {
    build.onResolve({ filter: /^@shared\// }, args => {
      return {
        path: require.resolve(args.path.replace('@shared', '../../shared'), 
      };
    });
  }
};
