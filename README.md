<!--- Strip out this top section when starting a new project -->
# Front-end Project Template

## Starting a new project

1. `$ git clone --depth 1 -o template git@github.com:TheGlobalMail/frontend-project-template.git new-project`
   This will clone the template into `./new-project` without history and the remote is named `templated` (isntead of `origin`)
2. *Optional.* Immediately checkout master to a template branch (`$ git checkout -b _template template/master`)... this will serve as a middleman for integrating changes back-and-forth between the project and the template. Switch back to master.
3. Update `name` in `component.json` and `package.json`. Update this `README.md` stripping out this info, updating the title, etc. Update `<title/>` in `app/index.html`.
4. Commit the name changes
5. Create a new repo on GitHub/whatever for the project and do `$ git remote add origin git@somerepo.git`
6. Now you can `$ git push origin master -u` to push the project and set master to push/fetch from the project repo
7. Running `git remote -v` should give you something like this:
    ```
    origin  git@github.com:TheGlobalMail/RockArt.git (fetch)
    origin  git@github.com:TheGlobalMail/RockArt.git (push)
    template  git@github.com:TheGlobalMail/frontend-project-template.git (fetch)
    template  git@github.com:TheGlobalMail/frontend-project-template.git (push)
    ```
8. Make awesome shiz...

<!-- Update below with project details -->
# {Project Name}

> {A short description about the project.}

* **Staging URL:** [http://cool-project.herokuapp.com/](http://cool-project.herokuapp.com/)
* **Production URL:** [http://cool-project.theglobalmail.org/](http://cool-project.theglobalmail.org/)

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