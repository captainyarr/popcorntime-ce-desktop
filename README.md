# [Popcorn Time Community](https://github.com/PopcornTime-CE/desktop)

[![Join the chat at https://gitter.im/PopcornTime-CE/desktop](https://badges.gitter.im/PopcornTime-CE/desktop.svg)](https://gitter.im/PopcornTime-CE/desktop?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![CircleCI](https://circleci.com/gh/captainyarr/popcorntime-ce-desktop.svg?style=shield)](https://app.circleci.com/pipelines/github/captainyarr/popcorntime-ce-desktop)

Allow anyone to easily watch their favorite movies, shows, and anime.

![Popcorn Time](src/app/images/icon.png)

This project would absolutely **not** be possible without the original developer's hard work into making Popcorn Time what it is today. All credit should go to them, we're just trying to help the community :)

***

## Getting Involved

Want to report a bug, request a feature, contribute or translate Popcorn Time? We need all the help we can get! You can also join in with our [community](README.md#community) to keep up-to-date and meet other Popcorn Timers.

## Contributing

Please don't post pull requests that reformats the code. Please don't remove whitespaces. Don't do any dirty job.

## Getting Started

If you're comfortable getting up and running from a `git clone`, this method is for you.

If you clone the GitLab repository, you will need to build a number of assets with npm.

The [master](https://github.com/captainyarr/popcorntime-ce-desktop/tree/master) branch which contains the latest release.

#### Requirements

1. You must have git installed
2. You must have npm installed

#### Running
*Runs the app without building, useful for testing*

1. `git clone https://github.com/captainyarr/popcorntime-ce-desktop.git`
1. `cd desktop`
1. `npm install`
1. `npm start`

#### Error

`The video could not be loaded, either because the server or network failed or because the format is not supported`

1. Update the [libffmpegsumo.so] in the NW.js cache folder via gulp:
  `npx gulp ffmpegcache`

2. Update the [libffmpegsumo.so] in the build folder via gulp:
  `npx gulp ffmpegbuild`

#### Building
*Builds the app for a packaged, runnable app*

1. `npm install`
2. `npx gulp build` **OR** `node_modules/.bin/gulp build` depending whether you have gulp installed globally or not. 
3. You can also build for different platforms by passing them with the `-p` argument as a comma-seperated list (For example: `npx gulp build -p osx64,win32`
1. There should be a `build/` directory containing the built files 
 
<a name="community"></a>
## Community

Keep track of Popcorn Time Community development and community activity.

* Join in discussions on the [Popcorn Time Subreddit](http://reddit.com/r/PopcornTimeCE)
* Chat with us on [![Join the chat at https://gitter.im/PopcornTime-CE/desktop](https://badges.gitter.im/PopcornTime-CE/desktop.svg)](https://gitter.im/PopcornTime-CE/desktop)

## Versioning

For transparency and insight into our release cycle, and for striving to maintain backward compatibility, Popcorn Time will be maintained according to the [Semantic Versioning](http://semver.org/) guidelines as much as possible.

Releases will be numbered with the following format:

`<major>.<minor>.<patch>-<build>`

Constructed with the following guidelines:

* A new *major* release indicates a large change where backwards compatibility is broken.
* A new *minor* release indicates a normal change that maintains backwards compatibility.
* A new *patch* release indicates a bugfix or small change which does not affect compatibility.
* A new *build* release indicates this is a pre-release of the version.

***

If you distribute a copy or make a fork of the project, you have to credit this project as source.
	
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 
This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 
You should have received a copy of the GNU General Public License along with this program.  If not, see http://www.gnu.org/licenses/ .

***

**This project and the distribution of this project is not illegal, nor does it violate *any* DMCA laws. The use of this project, however, may be illegal in your area. Check your local laws and regulations regarding the use of torrents to watch potentially copyrighted content. The maintainers of this project do not condone the use of this project for anything illegal, in any state, region, country, or planet. *Please use at your own risk*.**

***
 
Copyright (c) 2020 Popcorn Time Community - Released under the [GPL v3 license](LICENSE.txt).
