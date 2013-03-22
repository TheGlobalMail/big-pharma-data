# Big Pharma Data

Data visualisations and downloads for Medicines Australia data

* **Staging URL:** [http://big-pharma-data.herokuapp.com/](http://big-pharma-data.herokuapp.com/)
* **Production URL:** [http://big-pharma-data.theglobalmail.org/](http://big-pharma-data.theglobalmail.org/)

## TODO

* fix spendratio
* do bins
  * zero
  * 10
  * 50
  * 200
  * 1000
  * 100000
* navigation
* toggles on graphs
* google map for international
  * use https://github.com/mledoze/countries/blob/master/countries.json
* data downloads

## Installing

Assuming you have `grunt-cli` and `bower` installed globally:

1. Clone the repo
2. Run `npm install`
3. Run `./bower-install` (this script will install a nested bootstrap in tgm-bootstrap so the LESS can compile properly).

## Setting up the CDN

1. Log into [https://mycloud.rackspace.com/](https://mycloud.rackspace.com/) with the `theglobalmail` account.
2. Go to `Files` and click `Create Container` and use the project name as the name.
3. Enable the CDN as a container
4. Modify the TTL to be something short e.g. 900 (15 minutes as opposed to default 72 hours) for development.
5. Note the HTTP link. This will be used as the CNAME for the project or as the
   backend for Fast.ly.
6. The CDN will not serve index.html as default index file. To enable it you must run the following (replaceing RACKSPACE_AUTH_KEY with the Rackspace API key): `curl -H "X-Auth-User: theglobalmail" -H "X-Auth-Key: RACKSPACE_AUTH_KEY" https://auth.api.rackspacecloud.com/v1.0/ -v`
7. Look for `X-Auth-Token: XXXXXXXX-XXXX-XXXX-XXXX-XXXfXXXXXXXX` in the headers of the response.
8. Use the token in this command (replace the token and the container name): `curl -X POST -H "X-Container-Meta-Web-Index: index.html" -H "X-Auth-Token: REPLACE_WITH_TOKEN" "https://storage101.dfw1.clouddrive.com/v1/MossoCloudFS_3d82889b-f53d-44ae-b198-bd722f87fff8/REPLACE_CONTAINER_NAME/" -v`
9. Set up a CNAME entry in AWS Route53 for
   `projectname-assets.theglobalmail.org` pointing to the CDN http domain.
10. If push-state url support is not required, add another CNAME entry for the
    main site pointing to the CDN.
11. Repeat for any other environemnts i.e.
    `projectname-staging-assets.theglobalmail.org`.

Notes:
* You can easily upload or modify files with CyberDuck if need be.
* You can purge a file via CyberDuck or via the Rackspace interface. File
purging is not instant.

## Setting up Fast.ly

Fastly is only required if you need support for push-state urls. If not, skip
this step.

This process is difficult to describe. Use the `talkingheads` project as an
example. The push-state relevant part is in the `Content` section and the
`catch all` request configuration.

The backend url should be the `-assets` domain pointing to the CDN.

Create a CNAME entry in AWS Route53 for the site pointing to `prod.a.fastly.com`.

## Development server and building

The build system is made on Grunt v0.4+

* `$ grunt` will build the whole project for production into a `./dist` folder
* `$ grunt build:staging` Build for staging (different CDN url)
* `$ grunt server` will start a dev server (default port 9000) with livereload, etc. LESS is compiled automatically.

The `dist/` folder isn't ignored by Git, so be careful not run it on a development branch and then accidentally commit it.

## Deploying

For staging, use a free Heroku instance so we don't have to worry about caching. For production, push directly to the CDN. Deployment is done on a throw-away branch.

**Pushing to the CDN requires you to set a `RACKSPACE_API_KEY` enviroment variable.**

### Deploying to the CDN
1. `$ grunt` or `$ grunt build:staging`
2. `$ grunt cloudfiles:[staging|dist]`
3. `$ grunt clean:dist`


### Deploying to Heroku
1. `$ git checkout -b deploy`
2. `$ grunt build:staging`
3. `$ git add dist/`
4. `$ git commit -m "Build" dist/`
5. `$ grunt cloudfiles:staging`
6. *Staging only* `$ git push heroku deploy:master --force`
7. `$ git checkout master`
8. `$ git branch -D deploy`

## Adding libraries, frameworks, dependencies

Most libraries are available through Bower, check using `bower search`. When doing `bower install` remember to add the `--save` flag so the component gets added to `component.json`. Components are installed into `app/components` which is ignored by Git.