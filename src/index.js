#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

const API_BASE = 'http://localhost:3001/api';

// Simple fetch wrapper
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to connect to API: ${error.message}`);
  }
}

// Display helpers
function printAgent(agent, index) {
  console.log(chalk.cyan(`\n${index + 1}. ${agent.icon} ${agent.name}`));
  console.log(`   Vendor: ${agent.vendor}`);
  console.log(`   Category: ${chalk.yellow(agent.category)}`);
  console.log(`   Rating: ${'★'.repeat(Math.floor(agent.rating))} ${agent.rating} (${agent.reviews} reviews)`);
  console.log(`   Price: ${agent.price === 0 ? chalk.green('Free') : `$${agent.price}/mo`}`);
  console.log(`   ${agent.description.substring(0, 60)}...`);
}

function printDeployed(deployed, index) {
  const statusColor = deployed.status === 'running' ? chalk.green : chalk.red;
  console.log(chalk.cyan(`\n${index + 1}. ${deployed.agent.icon} ${deployed.agent.name}`));
  console.log(`   Status: ${statusColor(deployed.status)}`);
  console.log(`   Deployed: ${new Date(deployed.deployedAt).toLocaleDateString()}`);
}

// Menu actions
async function listAgents(category = null) {
  const spinner = ora('Fetching agents...').start();
  try {
    const params = category && category !== 'All' ? `?category=${category}` : '';
    const agents = await apiCall(`/agents${params}`);
    spinner.succeed(`Found ${agents.length} agents`);
    
    if (agents.length === 0) {
      console.log(chalk.yellow('\nNo agents found.'));
      return;
    }
    
    agents.forEach(printAgent);
  } catch (error) {
    spinner.fail(error.message);
  }
}

async function searchAgents(query) {
  const spinner = ora('Searching agents...').start();
  try {
    const agents = await apiCall(`/agents?search=${encodeURIComponent(query)}`);
    spinner.succeed(`Found ${agents.length} agents`);
    
    if (agents.length === 0) {
      console.log(chalk.yellow('\nNo agents found matching your search.'));
      return;
    }
    
    agents.forEach(printAgent);
  } catch (error) {
    spinner.fail(error.message);
  }
}

async function deployAgent(agentId) {
  const spinner = ora('Deploying agent...').start();
  try {
    const deployed = await apiCall('/deploy', {
      method: 'POST',
      body: JSON.stringify({ agentId }),
    });
    spinner.succeed(chalk.green(`Successfully deployed ${deployed.agent.name}!`));
  } catch (error) {
    spinner.fail(error.message);
  }
}

async function listDeployed() {
  const spinner = ora('Fetching deployed agents...').start();
  try {
    const deployed = await apiCall('/deployed');
    spinner.succeed(`Found ${deployed.length} deployed agents`);
    
    if (deployed.length === 0) {
      console.log(chalk.yellow('\nNo agents deployed yet.'));
      return;
    }
    
    deployed.forEach(printDeployed);
  } catch (error) {
    spinner.fail(error.message);
  }
}

async function showStats() {
  const spinner = ora('Fetching stats...').start();
  try {
    const stats = await apiCall('/stats');
    spinner.stop();
    
    console.log(chalk.cyan('\n📊 Dashboard Statistics'));
    console.log('─'.repeat(30));
    console.log(`Agents Deployed: ${chalk.green(stats.totalDeployed)}`);
    console.log(`Active Workflows: ${chalk.yellow(stats.activeWorkflows)}`);
    console.log(`API Calls (Month): ${stats.totalApiCalls.toLocaleString()}`);
    console.log(`Average Uptime: ${chalk.green(stats.uptime)}%`);
  } catch (error) {
    spinner.fail(error.message);
  }
}

async function mainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.cyan('🤖 Agent Marketplace CLI'),
      choices: [
        { name: '📋 List all agents', value: 'list' },
        { name: '🔍 Search agents', value: 'search' },
        { name: '🚀 Deploy an agent', value: 'deploy' },
        { name: '📦 List deployed agents', value: 'deployed' },
        { name: '📊 Show statistics', value: 'stats' },
        { name: '❌ Exit', value: 'exit' },
      ],
    },
  ]);

  switch (action) {
    case 'list': {
      const { category } = await inquirer.prompt([
        {
          type: 'list',
          name: 'category',
          message: 'Select category:',
          choices: ['All', 'Development', 'Data', 'Creative', 'Security', 'Productivity', 'Communication'],
        },
      ]);
      await listAgents(category);
      break;
    }
    case 'search': {
      const { query } = await inquirer.prompt([
        {
          type: 'input',
          name: 'query',
          message: 'Search query:',
          validate: (input) => input.length > 0 || 'Please enter a search term',
        },
      ]);
      await searchAgents(query);
      break;
    }
    case 'deploy': {
      const agents = await apiCall('/agents');
      const { agentId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'agentId',
          message: 'Select agent to deploy:',
          choices: agents.map((a) => ({
            name: `${a.icon} ${a.name} - ${a.price === 0 ? 'Free' : `$${a.price}/mo`}`,
            value: a.id,
          })),
        },
      ]);
      await deployAgent(agentId);
      break;
    }
    case 'deployed':
      await listDeployed();
      break;
    case 'stats':
      await showStats();
      break;
    case 'exit':
      console.log(chalk.yellow('\nGoodbye! 👋'));
      process.exit(0);
      return;
  }

  await mainMenu();
}

// Start the CLI
console.log(chalk.cyan(`
╔════════════════════════════════════════╗
║     🤖 Agent Marketplace CLI          ║
║     Manage AI agents from terminal     ║
╚════════════════════════════════════════╝
`));

mainMenu().catch((error) => {
  console.error(chalk.red(`\nError: ${error.message}`));
  process.exit(1);
});
