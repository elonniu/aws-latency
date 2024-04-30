#! /usr/bin/env node

import ora from 'ora';
import Table from 'cli-table3';
import chalk from 'chalk';
import axios from 'axios';
import stripAnsi from 'strip-ansi';
import ping from 'ping';
import {currentVersion} from "sst-helper";

await versionCheck();

const regions = [
    {Endpoint: 'ec2.cn-north-1.amazonaws.com.cn', RegionName: 'cn-north-1', City: 'Beijing, China'},
    {Endpoint: 'ec2.cn-northwest-1.amazonaws.com.cn', RegionName: 'cn-northwest-1', City: 'Ningxia, China'},
    {Endpoint: 'ec2.ap-south-1.amazonaws.com', RegionName: 'ap-south-1', City: 'Mumbai, India'},
    {Endpoint: 'ec2.eu-south-1.amazonaws.com', RegionName: 'eu-south-1', City: 'Milan, Italy'},
    {Endpoint: 'ec2.ap-south-2.amazonaws.com', RegionName: 'ap-south-2', City: 'Hyderabad'},
    {Endpoint: 'ec2.eu-south-2.amazonaws.com', RegionName: 'eu-south-2', City: 'Spain'},
    {Endpoint: 'ec2.me-central-1.amazonaws.com', RegionName: 'me-central-1', City: 'UAE'},
    {Endpoint: 'ec2.eu-central-2.amazonaws.com', RegionName: 'eu-central-2', City: 'Zurich'},
    {Endpoint: 'ec2.ap-southeast-3.amazonaws.com', RegionName: 'ap-southeast-3', City: 'Jakarta'},
    {Endpoint: 'ec2.ap-southeast-4.amazonaws.com', RegionName: 'ap-southeast-4', City: 'Melbourne'},
    {Endpoint: 'ec2.il-central-1.amazonaws.com', RegionName: 'il-central-1', City: 'Tel Aviv'},
    {Endpoint: 'ec2.ca-central-1.amazonaws.com', RegionName: 'ca-central-1', City: 'Montreal, Canada'},
    {Endpoint: 'ec2.eu-central-1.amazonaws.com', RegionName: 'eu-central-1', City: 'Frankfurt, Germany'},
    {Endpoint: 'ec2.us-west-1.amazonaws.com', RegionName: 'us-west-1', City: 'N. California, USA'},
    {Endpoint: 'ec2.us-west-2.amazonaws.com', RegionName: 'us-west-2', City: 'Oregon, USA'},
    {Endpoint: 'ec2.af-south-1.amazonaws.com', RegionName: 'af-south-1', City: 'Cape Town, South Africa'},
    {Endpoint: 'ec2.eu-north-1.amazonaws.com', RegionName: 'eu-north-1', City: 'Stockholm, Sweden'},
    {Endpoint: 'ec2.eu-west-3.amazonaws.com', RegionName: 'eu-west-3', City: 'Paris, France'},
    {Endpoint: 'ec2.eu-west-2.amazonaws.com', RegionName: 'eu-west-2', City: 'London, United Kingdom'},
    {Endpoint: 'eu-west-1.ec2.amazonaws.com', RegionName: 'eu-west-1', City: 'Ireland'},
    {Endpoint: 'ec2.ap-northeast-3.amazonaws.com', RegionName: 'ap-northeast-3', City: 'Osaka, Japan'},
    {Endpoint: 'ec2.ap-northeast-2.amazonaws.com', RegionName: 'ap-northeast-2', City: 'Seoul, South Korea'},
    {Endpoint: 'ec2.me-south-1.amazonaws.com', RegionName: 'me-south-1', City: 'Bahrain'},
    {Endpoint: 'ec2.ap-northeast-1.amazonaws.com', RegionName: 'ap-northeast-1', City: 'Tokyo, Japan'},
    {Endpoint: 'ec2.sa-east-1.amazonaws.com', RegionName: 'sa-east-1', City: 'Sao Paulo, Brazil'},
    {Endpoint: 'ec2.ap-east-1.amazonaws.com', RegionName: 'ap-east-1', City: 'Hong Kong'},
    {Endpoint: 'ec2.ap-southeast-1.amazonaws.com', RegionName: 'ap-southeast-1', City: 'Singapore'},
    {Endpoint: 'ec2.ap-southeast-2.amazonaws.com', RegionName: 'ap-southeast-2', City: 'Sydney, Australia'},
    {Endpoint: 'ec2.amazonaws.com', RegionName: 'us-east-1', City: 'N. Virginia, USA'},
    {Endpoint: 'ec2.us-east-2.amazonaws.com', RegionName: 'us-east-2', City: 'Ohio, USA'},
];

const run = async () => {

    let results = [];

    for (const region of regions) {

        ping.promise.probe(region.Endpoint, {timeout: 10})
            .then(function (res) {

                res.host = region.Endpoint;
                // get city from regions
                res.city = regions.find(region => region.Endpoint === res.host)?.City;
                // region only from hostname like ec2.ap-southeast-1.amazonaws.com
                res.region = regions.find(region => region.Endpoint === res.host)?.RegionName;

                results.push({
                    region: `${res.region} (${res.city})`,
                    time: res.time,
                });

                console.log(chalk.yellow(res.region), region.Endpoint, chalk.green(res.time + 'ms'));

                if (results.length === regions.length) {
                    results.sort((a, b) => (a.time > b.time) ? 1 : -1);
                    regionList(results);
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

function regionList(results) {
    if (results.length === 0) {
        return;
    }

    results.forEach((item, index) => {
        item.index = index + 1;
    });

    table(results, ["index", "region", "time"]);
    console.log(chalk.yellow(`Total ${results.length} regions`));
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
