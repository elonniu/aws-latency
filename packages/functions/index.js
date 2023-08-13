#! /usr/bin/env node

import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import axios from 'axios';
import stripAnsi from 'strip-ansi';
import {DescribeRegionsCommand, EC2Client} from "@aws-sdk/client-ec2";
import ping from 'ping';
import {currentVersion} from "sst-helper";

const client = new EC2Client({});

await versionCheck();

const run = async () => {
    const data = await client.send(new DescribeRegionsCommand({}));

    let list = [];

    data.Regions.push({
        Endpoint: 'ec2.cn-north-1.amazonaws.com.cn',
        RegionName: 'cn-north-1',
        OptInStatus: 'opted-in'
    });

    data.Regions.push({
        Endpoint: 'ec2.cn-northwest-1.amazonaws.com.cn',
        RegionName: 'cn-northwest-1',
        OptInStatus: 'opted-in'
    });

    for (const region of data.Regions) {


        ping.promise.probe(region.Endpoint)
            .then(function (res) {

                list.push(res);

                console.log(region.Endpoint + ' ' + res.time + 'ms');

                if (list.length === data.Regions.length) {
                    list.sort((a, b) => (a.time > b.time) ? 1 : -1);
                    regionList(list);
                }
            });

    }


};

run().catch(console.error);

function table(data, columnOrder = []) {

    const head = columnOrder !== []
        ? columnOrder.map(key => chalk.green(key))
        : Object.keys(data[0]).map(key => chalk.green(key));

    const table = new Table({
        head
    });

    data.forEach(item => {
        const row = head.map(key => {
            const value = item[stripAnsi(key)];
            return typeof value === 'object' ? JSON.stringify(value) : value;
        });
        table.push(row);
    });

    console.log(table.toString());
}

function regionList(data) {
    if (data.length === 0) {
        return;
    }

    table(data, ["host", "alive", "time", "packetLoss", "numeric_host"]);
}

async function versionCheck() {
    const spinner = ora('Waiting...').start();
    try {
        const response = await axios.get('https://registry.npmjs.org/aws-latency');
        const serverVersion = response.data['dist-tags'].latest;
        const latestVersion = await currentVersion('aws-latency');
        if (serverVersion !== latestVersion) {
            spinner.stop();
            console.log(chalk.yellow(`Version ${chalk.bold(chalk.green(serverVersion))} is available. Your version is ${chalk.bold(chalk.red(latestVersion))}`));
            console.log(chalk.yellow(`Please update by run: ${chalk.bold(chalk.green('npm i -g aws-latency'))}\n`));
            process.exit(1);
        }
    } catch (error) {
        console.error(chalk.red('Failed to check for updates: ' + error.message));
    }

    spinner.stop();
}
