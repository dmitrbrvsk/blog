if (process.env.npm_config_user_agent && !process.env.npm_config_user_agent.includes('yarn')) {
    console.log(process.env);
    console.error('You must use yarn to install dependencies, now using', process.env.npm_execpath);
    console.log('Recommended version is yarn@0.27.5');
    process.exit(1);
}
