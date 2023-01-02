if (user === undefined) {
    var DEBUG_MODE = false

    var BASE_APP_URL = "https://app.recruitcrm.io";
    if (DEBUG_MODE) {
        BASE_APP_URL = "http://localhost";
    }
    var user = {};
    var extSettings = {}
    var profile = {};
    var jobSelectId = '#assign_to_job_select';
    var jobs = undefined;
    var hotlists = {};
    var userCallFinished = false;
    var newWindow = null;
    var base64Text = "";
    var tagInputs = {};
    var linkedInObserver = null;
    var copiedLinkedinUrl = null;
    var Domains = {
        'www.linkedin.com': {
            slugParamNumber: 1,
            name: "LinkedIn"
        },
        'facebook.com': {
            slugParamNumber: 0,
            csp: true
        },
        'twitter.com': {},
        'www.xing.com': {
            slugParamNumber: 1,
            name: "Xing"
        },
        'app.zoominfo.com': {
            name: "Zoom Info"
        },
        'employers.indeed.com': {
            topDocFrame: true,
            name: "Indeed"
        },
        'stackoverflow.com': {},
        'github.com': {},
        'www.glassdoor.com': {},
        'mail.google.com': {
            name: "Gmail"
        },
        'outlook.live.com': {
            name: "Outlook"
        },
        'outlook.office365.com': {
            name: "Outlook"
        },
        'outlook.office.com': {
            name: "Outlook"
        },
        'outlook.microsoft365.com': {
            name: "Outlook"
        },
        'outlook.microsoft.com': {
            name: "Outlook"
        },
        'go.zoominfo.com': {
            name: "ZoomInfo"
        },
    };
    var Monitors = [];
    var candidate = {};
    var candidateNotes = [];
    var company = {};
    var _comapnyid = '';
    var contact = {};
    var contactNotes = [];
    var submitedEntity = undefined;
    var currentUrlObj = window.top.location
    var previousUrl = JSON.parse(JSON.stringify(currentUrlObj));
    var notifications = [];
    var notification_ids = [];
    var assignedJobs = [];
    var hiringStages = [];
    var hiringStageTriggers = [];
    var selectedJobId = null
    var selectedAssignmentId = null
    var ctp = {
        "www.linkedin.com": false
    }
    var do_log = function (message) {
        if (DEBUG_MODE) {
            console.log(message);
        }
    };
    var fromTopJQcontext = function (selector, topDocIframe = false) {
        if (!topDocIframe) {
            return $(selector, window.top.document);
        } else {
            return $(selector, window.top.document.getElementById('rcrmtTopDocFrame').contentDocument);
        }
    }
    var EventListnsers = [];
    function resetProfileUI() {
        if ($('#rcrmtTopDocFrame', window.top.document).length) {
            $('#rcrmtTopDocFrame', window.top.document).remove();
        }
        $(".image").each(function (index, element) {
            $(element).attr("src", $(element).attr('data-defaultrsrc'));
        });
        $(".cimage").each(function (index, element) {
            $(element).attr("src", $(element).attr('data-defaultrsrc'));
        });
        $("input").each(function (index, element) {
            $(element).val("");
        });
        $("textarea").each(function (index, element) {
            $(element).val("");
        });
        $('.candidate_resume_p').each(function (index, element) {
            $(element).text("Click or Drag Candidate Resume/CV Here.");
        });
        $('.candidate_resume_p').removeClass('color-primary');
        $('.exists-message-container').toggleClass('slidedown', false).toggleClass('d-block', false).toggleClass('d-none', true);
        $('.form-container').toggleClass('slidedown', false);
        $('#pdf_version_tag').val("")
        Object.values(tagInputs).forEach((tagInput) => {
            tagInput.removeAllTags();
        });
        base64Text = "";
    }
    function updateProfileUI(reset = true, checkDuplicate = false, callback = function () { }) {
        if (reset) {
            resetProfileUI();
        }
        Object.keys(profile).forEach(selector => {
            if (profile[selector] != undefined) {
                switch (profile[selector].type) {
                    case "image":
                        $("." + selector).each(function (index, element) {
                            $(element).attr("src", profile[selector].value.trim());
                        });
                        break;
                    case "input":
                        $("." + selector).each(function (index, element) {
                            if (profile[selector] !== undefined && profile[selector].value !== undefined) {
                                $(element).val(profile[selector].value.trim());
                            }
                        });
                        break;
                    case "longText":
                        fullResumeText = profile[selector].value.trim();
                        break;
                    case "tags":
                        $("." + selector + ".tagified").each(function (index, element) {
                            if (profile[selector] !== undefined && profile[selector].value !== undefined) {
                                tagInputs[$(element).attr('name')].removeAllTags()
                                if (profile[selector].value.length) {
                                    tagInputs[$(element).attr('name')].addTags(profile[selector].value)
                                }
                            }
                        });
                        break;
                    default:
                        break;
                }
                profile[selector] = undefined;
            }
        });

        // Get and set SF settings
        SetSFSettingData();
    }

    function SetSFSettingData(){
        // Read it using the storage API
        extSettings = getFromLocalStorage();
        if (extSettings.SFUserSettings != null)
        {
            var usersettings = extSettings.SFUserSettings.sfusersettings;
            var sfusername = usersettings.sfusername;
            var sfpassword = usersettings.sfuserpassword;
            var sfclientid = usersettings.clientid;
            var sfclientsecret = usersettings.clientsecret;
            $('#sfUsername').val(sfusername);
            $('#sfPassword').val(sfpassword);
            $('#sfClientid').val(sfclientid);
            $('#sfClientsecret').val(sfclientsecret);
        }
    }

    /**
     * Returns if slugs are to be compared or not
     */
    function checkSlug() {
        var checkSlug = true;
        if (currentUrlObj.href.indexOf('https://www.linkedin.com/talent/') > -1) { //Don
            checkSlug = false;
        }
        if (currentUrlObj.href.indexOf('https://www.linkedin.com/sales/') > -1) {
            checkSlug = false;
        }
        return checkSlug;
    }

    /**
     * Compares previous and current url and returns true if the slug has changed else returns false
     * Returns true in cases where slug is not be checked so the process continues as new profile
     */
    function slugChanged() {
        var slugChanged = true;
        if (!checkSlug()) {
            return slugChanged;
        }
        var strPreviousUrl = previousUrl.href;
        if (strPreviousUrl != '' && Object.keys(Domains).indexOf(document.domain) != -1) {
            var slugDomain = Domains[document.domain];
            var prevUrlPaths = previousUrl.pathname.split('/');
            var currUrlPaths = currentUrlObj.pathname.toString().split('/');
            prevUrlPaths.splice(0, 1); currUrlPaths.splice(0, 1);
            if (prevUrlPaths[slugDomain.slugParamNumber] != undefined && currUrlPaths[slugDomain.slugParamNumber] != undefined) {
                if (prevUrlPaths[slugDomain.slugParamNumber] == currUrlPaths[slugDomain.slugParamNumber]) {
                    return false;
                }
            }
            // if (urlPaths)
        }
        return slugChanged;
    }
    //-----------------------------------------------MonitorsSectionStart-----------------------------------------------------//
    function startMonitors() {
        stopAllMonitors();
        var domainIndex = Object.keys(Domains).indexOf(document.domain);
        resetProfileUI();
        $('.linkedin-pdf').toggleClass('d-none', true)
        if (Domains[document.domain] && Domains[document.domain].topDocFrame) {
            var i = document.createElement('iframe');
            i.style.display = 'none';
            document.body.appendChild(i);
            i.src = currentUrlObj;
            i.id = "rcrmtTopDocFrame";
            window.top.document.body.appendChild(i);
            // console.log('creating an iframe in top doc');
        }
        switch (domainIndex) {
            case 0:
                $('.linkedin-pdf').toggleClass('d-none', false)
                if (isLinkedInProfilePage()) {
                    Monitors.push(startLinkedMonitor());
                    setFrameLoadingState();
                }
                break;
            // case 1:
            //     if (isFacebookProfilePage()) {
            //         Monitors.push(startFacebookMonitor());
            //         setFrameLoadingState();
            //     }
            //     break;
            case 3:
                if (isXingProfilePage()) {
                    Monitors.push(startXingMonitor());
                    setFrameLoadingState();
                }
                break;
            case 4:
                if (isZoomInfoProfilePage()) {
                    Monitors.push(startZoomInfoMonitor());
                    setFrameLoadingState();
                }
                break;
            case 5:
                if (isIndeedProfilePage()) {
                    Monitors.push(startIndeedMonitor());
                    setFrameLoadingState();
                }
                break;
            case 9:
                if (isGmailThreadPage()) {
                    Monitors.push(startGmailMonitor());
                    setFrameLoadingState();
                }
                break;
            case 10:
                if (isOutlookThreadPage()) {
                    Monitors.push(startOutlookMonitor());
                    setFrameLoadingState();
                }
                break;
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
                if (isZoomProfilePage()) {
                    Monitors.push(startZoomMonitor());
                    setFrameLoadingState();
                }
                break;
            default:
                break;
        }
    }

    function stopAllMonitors() {
        Monitors.forEach(interval => {
            clearInterval(interval);
        });
    }
    function startLinkedInObserver() {
        if (!linkedInObserver) {
            const addLogo = debounce(function () {
                if (!extSettings.ctp) {
                    return
                }
                let linPathNames = [
                    '/in/',
                    '/company/',
                    // 'school'
                ]
                let linKeys = {
                    '[data-control-name="background_details_company"]:not(.rcrmfied-133)': {},//Profile details page experience section
                    // '[data-control-name="background_details_school"]:not(.rcrmfied-133)': {},//Profile details page education section
                    '[data-control-name="actor_container"]:not(.rcrmfied-133)': {}, //Feed page profiles
                    '[data-control-name="browsemap_profile"]:not(.rcrmfied-133)': {},//Profile details page people also viewed section
                    '[data-control-name="pymk_profile"]:not(.rcrmfied-133)': {},//Profile details page people you may know section
                    '[data-control-name="recommendation_details_profile"]:not(.rcrmfied-133)': {},//Profile details Recommendations section
                    '[data-control-name="interests_profile_clicked"]:not(.rcrmfied-133)': {},//Profile details page Interests section: profiles
                    '[data-control-name="interests_company_clicked"]:not(.rcrmfied-133)': {},//Profile details page Interests section: companies
                    '[data-control-name="background_details_certification"]:not(.rcrmfied-133)': {},//Profile details page certifications section
                    '.entity-result .entity-result__image .app-aware-link:not(.rcrmfied-133)': {},//Search results list page
                    '.entity-result .entity-result__universal-image .app-aware-link:not(.rcrmfied-133)': {},//Search results list page
                    '.search-marvel-srp .reusable-search__entity-results-list .entity-result .entity-result__image-1 .app-aware-link:not(.rcrmfied-133)': {} //Search results list page


                }
                Object.keys(linKeys).forEach(linKey => {
                    elems = fromTopJQcontext(linKey);
                    if (elems.length) {

                        $(elems).addClass('rcrmfied-133').each((index, elem) => {
                            linPathNames.forEach(linPathName => {
                                let ctpSpan = document.createElement('span');
                                ctpSpan.innerHTML = '<button class="rcrm-ctp" style="line-height:18px !important;">R</button>'
                                var classList = "rcrm-ctp-span";
                                classList = linKeys[linKey].classList ? classList + " " + linKeys[linKey].classList : classList
                                ctpSpan.classList = classList;
                                if (elem.href.indexOf(linPathName) > -1) {
                                    $(elem).parent().append(ctpSpan).addClass("pos-rel");
                                }
                            });
                        })
                    }
                });
                //Add on click event ot only the newly added profile links.
                fromTopJQcontext('.rcrm-ctp-span:not(.event-added)').on('click', '.rcrm-ctp', function (e) {
                    previousUrl = new URL(currentUrlObj.href)
                    currentUrlObj = new URL($('a', $(e.currentTarget.parentElement).parent())[0].href)
                    window.postMessage({
                        "message": "urlchanged",
                        "linkedInCtp": true
                    });
                    e.preventDefault()
                    e.stopPropagation();
                    return;
                });
                fromTopJQcontext('.rcrm-ctp-span:not(.event-added)').addClass("event-added")
            }, 500)
            linkedInObserver = new MutationObserver(() => addLogo());
            var container = window.top.document.body
            var config = {
                childList: true,
                subtree: true
            };
            // add logos to preloaded urls
            addLogo();
            linkedInObserver.observe(container, config);
            return linkedInObserver;
        } else {
            return false
        }
    }
    function stopLinkedInObserver(removeExisting = true) {
        if (linkedInObserver) {
            linkedInObserver.disconnect()
            linkedInObserver = null
            //Remove all pre-recrmfied profile links
            if (removeExisting) {
                fromTopJQcontext(".rcrm-ctp-span").remove(0)
                fromTopJQcontext(".rcrmfied-133").removeClass("rcrmfied-133")
            }

        }
    }
    function startLinkedMonitor() {
        stopLinkedInObserver(false)
        if (extSettings.ctp !== false) {
            startLinkedInObserver();
        }
        return linkedInterval = setInterval(() => {
            do_log = "linked in interval is running";
            if (ctp[window.top.document.domain] || fromTopJQcontext(".profile-view-grid").length || fromTopJQcontext(".org-top-card").length || $("#primary-content") || fromTopJQcontext("#profile-container") || fromTopJQcontext(".company-page").length) {//Page loaded
                do_log = "linked in interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                parseLinkedIn();
                stopAllMonitors();
            }
        }, 500);
    }
    function startFacebookMonitor() {
        var fbIntervalCount = 0
        return facebookInterval = setInterval(() => {
            do_log = "facebook interval is running";
            if (fromTopJQcontext("#pagelet_timeline_main_column").length || fbIntervalCount < 15) {//Page loaded (Or a page that is non parsable)
                do_log = "facebook interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                parseFacebook();
                stopAllMonitors();
            }
            fbIntervalCount++;
        }, 500);
    }
    function startXingMonitor() {
        return xingInterval = setInterval(() => {
            do_log = "Xing interval is running";
            if (fromTopJQcontext("#profile-xingid-container").length || fromTopJQcontext("#maincontent.companies").length || fromTopJQcontext("#cv-print-header").length) {//Page loaded
                do_log = "Xing interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                stopAllMonitors();
                parseXing();
            }
        }, 500);
    }
    function startZoomInfoMonitor() {
        return zoomInterval = setInterval(() => {
            do_log = "Zoominfo interval is running";
            if (fromTopJQcontext(".contactProfile").length || fromTopJQcontext(".profile-container").length) {//Page loaded
                do_log = "Zoominfo interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                parseZoomInfo();
                stopAllMonitors();
            }
        }, 500);
    }

    function startZoomMonitor() {
        return zoomInterval = setInterval(() => {
            do_log = "Zoominfo interval is running";
            if (fromTopJQcontext(".contactProfile").length || fromTopJQcontext(".profile-container").length) {//Page loaded
                do_log = "Zoominfo interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                parseZoom();
                stopAllMonitors();
            }
        }, 500);
    }

    function startIndeedMonitor() {
        return zoomInterval = setInterval(() => {
            do_log = "Indeed interval is running";
            if (fromTopJQcontext("#candidateDetailsPanel", true).length) {//Page loaded
                do_log = "Indeed interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                parseIndeed();
                stopAllMonitors();
            }
        }, 500);
    }
    function startGmailMonitor() {
        return gmailInterval = setInterval(() => {
            do_log = "Gmail interval is running";
            if (fromTopJQcontext("#\\:1").length) {//Page loaded
                do_log = "Gmail interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                parseGmail();
                stopAllMonitors();
            }
        }, 500);
    }
    function startOutlookMonitor() {
        return outlookInterval = setInterval(() => {
            do_log = "Outlook interval is running";
            $outlookMonitorCounter = 0;
            if (fromTopJQcontext("._3BpnlUwgtfNUWLoQytJYRy").length) {//Page loaded
                // if (fromTopJQcontext(".B1IVVpQay0rPzznhParFr").length) {//Page loaded
                $outlookMonitorCounter++;
                do_log = "Outlook interval stopped";
                do_log = "parsing data";
                $("#candidate_link").click();
                parseOutlook();
                stopAllMonitors();
            } else if ($outlookMonitorCounter > 20) {
                stopAllMonitors();
            }
        }, 500);
    }
    //-----------------------------------------------MonitorsSectionEnd-----------------------------------------------------//

    //-----------------------------------------------ParsingSectionStart--------------------------------------------------//

    //-----------------------------------------------LinkedInParsingSectionStart--------------------------------------------//


    function extractPersonFromLinkedInResponse(response) {
        if (response) {
            var versionTag = "";
            if (response.hasOwnProperty('profileContactInfo')) {
                let linContact = response.profileContactInfo;
                if (linContact.emailAddress && linContact.emailAddress.length) {
                    profile.email = {
                        "value": linContact.emailAddress || '',
                        "type": "input"
                    };
                }
                if (linContact.phoneNumbers && linContact.phoneNumbers.length) {
                    profile.phone = {
                        "value": linContact.phoneNumbers[0].number || '',
                        "type": "input"
                    };
                }
            }
            if (response.hasOwnProperty('profileView')) {
                let linProfile = response.profileView;
                if (linProfile.profile) {
                    versionTag = linProfile.profile.versionTag
                    profile.pdf_version_tag = {
                        "type": "input",
                        "value": versionTag
                    }
                    var name = linProfile.profile.firstName + ' ' + linProfile.profile.lastName;
                    name = name.trim().split(' ')
                    var fname = name[0].trim() || '';
                    profile.fname = {
                        "value": fname,
                        "type": "input"
                    }
                    var lname = name.join(' ').replace(name[0], '').trim();
                    profile.lname = {
                        "value": lname,
                        "type": "input"
                    }
                    if (linProfile.profile.hasOwnProperty('miniProfile')) {
                        profile.linkedin = {
                            "value": linProfile.profile.miniProfile.publicIdentifier ? ('https://www.linkedin.com/in/' + linProfile.profile.miniProfile.publicIdentifier) : '',
                            "type": "input"
                        }
                        if (linProfile.profile.miniProfile.picture) {
                            var imgUrl = extractLinkedInImg(linProfile.profile.miniProfile.picture);
                            profile.image = {
                                "value": imgUrl || '',
                                "type": "image"
                            };
                        }
                    }
                    var geoLocation = linProfile.profile.geoLocationName ? (linProfile.profile.geoLocationName + ", ") : '';
                    var geoCountry = linProfile.profile.geoCountryName || '';

                    var _location = geoLocation + geoCountry;
                    profile.location = {
                        "value": _location,
                        "type": "input"
                    }
                }

                if (linProfile.hasOwnProperty('positionView') && linProfile.positionView.elements) {
                    if (linProfile.positionView.elements.length) {
                        let position = linProfile.positionView.elements[0];
                        if (position) {
                            profile.organisation = {
                                "value": position.companyName || '',
                                "type": "input"
                            }
                            profile.cname = {
                                "value": position.companyName || '',
                                "type": "input"
                            }
                            profile.position = {
                                "value": position.title || '',
                                "type": "input"
                            }
                            if (position.company && position.company.miniCompany) {
                                let linMCompany = position.company.miniCompany;
                                let clinkedin = linMCompany.universalName;
                                if (clinkedin.indexOf("linkedin.com/") < 0) {
                                    clinkedin = "https://www.linkedin.com/company/" + clinkedin
                                }
                                profile.clinkedin = {
                                    "value": clinkedin || '',
                                    "type": "input"
                                }
                                if (linMCompany.logo) {
                                    var imgUrl = extractLinkedInImg(linMCompany.logo);
                                    profile.cimage = {
                                        "value": imgUrl || '',
                                        "type": "image"
                                    };
                                }
                            }

                        }
                    }
                }
            }
            if (response.hasOwnProperty('skills')) {
                var _skills = response.skills
                var skills = [];
                var profileSkills = _skills.elements;
                if (profileSkills && profileSkills.length) {
                    skills = profileSkills.map(skill => skill.name);
                    profile.skill = {
                        'value': skills,
                        'type': "tags"
                    }
                }
            }
            finishParsing(true);
        }
    }
    function extractCompanyFromLinkedInResponse(response) {
        if (response && response.company && response.company.elements && response.company.elements.length) {
            var linCompany = response.company.elements[0];
            var website = linCompany.companyPageUrl || "";
            profile.website = { "value": website, "type": "input" };
            if (linCompany.logo && linCompany.logo.image) {
                var imgUrl = extractLinkedInImg(linCompany.logo.image)
                profile.cimage = {
                    "value": imgUrl || '',
                    "type": "image"
                };
            }
            profile.cname = {
                "value": linCompany.name || '',
                "type": "input"
            }
            profile.aboutcompany = {
                "value": linCompany.description || '',
                "type": "input"
            }
            var headquarter = linCompany.headquarter;
            if (headquarter) {
                var clocation = headquarter.line1 || "";
                clocation = headquarter.line2 ? clocation + headquarter.line2 : clocation;
                clocation = headquarter.postalCode ? clocation + " " + headquarter.postalCode : clocation;
                clocation = headquarter.city ? clocation + ", " + headquarter.city : clocation;
                clocation = headquarter.geographicArea ? clocation + ", " + headquarter.geographicArea : clocation;
                clocation = headquarter.country ? clocation + ", " + headquarter.country : clocation;
                profile.clocation = {
                    "value": clocation.replace(/,+/g, ',').trim().replace(/^,|,$/g, ''),
                    "type": "input"
                };
                profile.clinkedin = { "value": linCompany.url, "type": "input" };
            }
            finishParsing(true);
            $("#company_link").click();
        }
    }
    function extractLinkedInImg(linPicture) {
        var picture = linPicture['com.linkedin.common.VectorImage'];
        var url = '';
        if (picture && picture.rootUrl && picture.artifacts) {
            let artifacts = picture.artifacts;
            if (artifacts && artifacts.length) {
                let bgImage = picture.rootUrl;
                let artifact = artifacts[1] ? artifacts[1] : artifacts[0];
                let artifactStr = artifact.fileIdentifyingUrlPathSegment;
                if (artifactStr) {
                    bgImage += artifactStr || '';
                    url = bgImage;
                }
            }
        }
        return url;
    }
    function parseLinkedIn() {
        if (ctp[window.top.document.domain]) {
            let entityId = 5
            if (currentUrlObj.pathname.split('/')[1] == "company") {
                entityId = 3;
            }
            parseLinkedInByUrl(entityId);
            return true;
        }
        if (currentUrlObj.toString().indexOf("linkedin.com/talent/hire") > -1
            || currentUrlObj.toString().indexOf("linkedin.com/talent/search") > -1) { // Recruiter 
            var localPhone = fromTopJQcontext('.contact-info [data-test-contact-phone]');
            if (localPhone.length) {
                profile.phone = {
                    "value": localPhone[0].innerText,
                    "type": "input"
                };
            }


            var localEmail = fromTopJQcontext('.contact-info [data-test-contact-email-address]');
            if (localEmail.length) {
                profile.email = {
                    "value": localEmail[0].innerText,
                    "type": "input"
                };
            }

            var linkedin = fromTopJQcontext('[data-test-public-profile-link]').attr('href');
            var slug = linkedin.split('/')[4];
            parseLinkedInRecruiterPersonByUrl(slug);
        } else if (currentUrlObj.toString().indexOf("linkedin.com/talent/profile") > -1) {
            // Recruiter Professional Services page 
            var email = fromTopJQcontext(".topcard-condensed__contact-info [data-test-contact-email-address]");
            if (email && email.length) {
                profile.email = {
                    "value": $(email[0]).text(),
                    "type": "input"
                };
            }
            var phone = fromTopJQcontext(".topcard-condensed__contact-info [data-test-contact-phone]");
            if (phone && phone.length) {
                profile.phone = {
                    "value": $(phone[0]).text(),
                    "type": "input"
                };
            }
            /* var name = fromTopJQcontext('.topcard-condensed .artdeco-entity-lockup__title').outerText;
            if (name && name.length) {
                setSplitName(name)
            }
            var location = fromTopJQcontext('.topcard-condensed [data-test-row-lockup-location]');
            if (location && location.length) {
                profile.location = {
                    "value": $(location[0]).text(),
                    "type": "input"
                };
            }
            var position = fromTopJQcontext('.position-item .background-entity__summary-definition--title');
            if (position && position.length) {
                profile.position = {
                    "value": $(position[0]).text(),
                    "type": "input"
                };
            }
            var organisation = fromTopJQcontext('.position-item .background-entity__summary-definition--subtitle');
            if (organisation && organisation.length) {
                profile.organisation = {
                    "value": $(organisation[0]).text(),
                    "type": "input"
                };
            }
            var bgImage = fromTopJQcontext(".topcard-condensed .artdeco-entity-lockup__image .ghost-person").length ? undefined : fromTopJQcontext(".topcard-condensed .artdeco-entity-lockup__image .lockup__image").attr("src");
            if (bgImage !== undefined && bgImage != "" && bgImage != null) {
                profile.image = {"value": bgImage, "type": "image" };
            }
            var linkedin = fromTopJQcontext('[data-test-personal-info-profile-link]');
            if(linkedin && linkedin.length){
                linkedin = $(linkedin[0]).attr('href');
                linkedin = 'https://www.'+linkedin.substr(linkedin.indexOf('linkedin.com'));
                profile.linkedin = { "type": "input", "value": linkedin == undefined ? "" : linkedin };            
            }
            finishParsing(true); */
            var linkedin = fromTopJQcontext('[data-test-personal-info-profile-link]')[0].href;
            var slug = linkedin.split('/')[4];
            parseLinkedInRecruiterPersonByUrl(slug);
        }
        else if (currentUrlObj.toString().indexOf("linkedin.com/recruiter/profile") > -1) { // Recruiter page
            var i = document.createElement('iframe');
            i.style.display = 'none';
            i.src = currentUrlObj;
            document.body.appendChild(i);
            i.onload = function () {
                var linkedinDetailIinterval = setInterval(() => {
                    let btn_info = $("button[data-lira-action=edit-contact-info]", i.contentWindow.document);
                    if (btn_info.length) {
                        clearInterval(linkedinDetailIinterval);
                        btn_info.click();
                        var linkedinRecuiterDetailIinterval = setInterval(() => {//Keep checking if detail content is loaded clear interval once loaded
                            if ($("#edit-contact-info-form", i.contentWindow.document).length) {
                                var email = $("#edit-contact-info-form #email-list ul li:nth-child(1) span.type-text", i.contentWindow.document).text();
                                profile.email = { "value": email, "type": "input" };
                                var phone = $("#edit-contact-info-form #phone-list ul li:nth-child(1) span.type-text", i.contentWindow.document).text();
                                profile.phone = { "value": phone, "type": "input" };
                                clearInterval(linkedinRecuiterDetailIinterval);
                                i.parentNode.removeChild(i);
                                finishParsing(false);
                            }
                        }, 250);
                    }
                }, 250);
            };
            var linkedin = fromTopJQcontext('#topcard div.module-footer ul li.public-profile.searchable a').attr('href');
            var slug = linkedin.split('/')[4];
            parseLinkedInRecruiterPersonByUrl(slug);
            /* 
                        var messageData = {};
                        messageData.message = "getLinkedInPersonProfilePdf";
                        messageData.type = "5";
                        messageData.slug = slug;
                        versionTag = $("#pdf_version_tag").val()
                        messageData.versionTag = versionTag;
                        sendMessageToParent(messageData); */

        }
        else if (currentUrlObj.toString().indexOf("linkedin.com/company/") > -1) { // Company page
            parseLinkedInByUrl(3);
        }
        else if (currentUrlObj.toString().indexOf("linkedin.com/recruiter/company/") > -1) { // Recruiter Company page
            parseLinkedInRecruiterCompanyByUrl();
        }
        else if (currentUrlObj.toString().indexOf("linkedin.com/school/") > -1) { // school page
            parseLinkedInByUrl(3);
        }
        else if (currentUrlObj.toString().indexOf("linkedin.com/sales/people/") > -1) { // Recruiter Professional Services page 

            window.top.document.querySelector('[data-control-name=copy_linkedin]').click();

            setTimeout(() => {
                window.focus();

                window.navigator.clipboard.readText()
                    .then(text => {
                        copiedLinkedinUrl = text;
                        var slug = text.split('/')[4];
                        parseLinkedInRecruiterPersonByUrl(slug);
                    })
                    .catch(err => {
                        console.error('Failed to read clipboard contents: ', err);
                    });
            }, 500);
        }
        else if (currentUrlObj.toString().indexOf("linkedin.com/sales/company/") > -1) { // Recruiter Professional Services page 

            window.top.document.querySelectorAll('.account-actions button.artdeco-dropdown__trigger.artdeco-dropdown__trigger--placement-bottom')[1].click();

            window.top.document.querySelector('[data-control-name=copy_li_url]').click();

            setTimeout(() => {
                window.focus();

                window.navigator.clipboard.readText()
                    .then(text => {
                        copiedLinkedinUrl = text;
                        var slug = text.split('/')[4];
                        parseLinkedInCompanyByUrl(slug);
                    })
                    .catch(err => {
                        console.error('Failed to read clipboard contents: ', err);
                    });
            }, 500);
        }
        else if (currentUrlObj.toString().indexOf("/search/results") < 0) {// All linked profile urls
            parseLinkedInByUrl(5)
        } else {
            finishParsing(true);
        }

    }
    /**
     * Calls the correct function that will call the function to fetch correct linkedin profile
     * @param {int} entityId 
     */
    function parseLinkedInByUrl(entityId) {
        var entFunMap = {
            3: parseLinkedInCompanyByUrl,
            5: parseLinkedInPersonByUrl,
            2: parseLinkedInPersonByUrl,
        }
        entFunMap[entityId]();

    }
    /**
     * 
     * @param {String} linkedInslug Slug of the Profile/Company
     * @param {String} message Message to send to popup.js inject_ed in linked in
     */
    function fetchLinkedInByUrl(linkedInslug, message, entityId) {
        try {
            var messageData = {};
            messageData.message = message;
            messageData.type = entityId;
            messageData.slug = linkedInslug;
            sendMessageToParent(messageData);
        } catch (error) {
            finishParsing(true);
        }
    }
    function parseLinkedInPersonByUrl() {
        var linkedInslug = $(currentUrlObj).attr('pathname');
        linkedInslug = linkedInslug.split("/")[2];
        message = "getLinkedInPersonProfile"
        fetchLinkedInByUrl(linkedInslug, message, 5);
    }
    function parseLinkedInRecruiterPersonByUrl(slug) {
        linkedInslug = slug;
        message = "getLinkedInPersonProfile"
        fetchLinkedInByUrl(linkedInslug, message, 5);
    }
    function parseLinkedInCompanyByUrl(slug = null) {
        var linkedInslug;
        if (!slug) {
            linkedInslug = $(currentUrlObj).attr('pathname');
            linkedInslug = linkedInslug.split("/")[2];
        } else {
            linkedInslug = slug;
        }

        linkedInslug = decodeURIComponent(linkedInslug);

        const format = /[ `!@#$%^&*()_+\=\[\]{};':"\\|,.<>\/?~]/;
        if (format.test(linkedInslug)) {
            linkedInslug = encodeURIComponent(linkedInslug);
        }

        message = "getLinkedInCompanyProfile"
        fetchLinkedInByUrl(linkedInslug, message, 3);
    }
    function parseLinkedInRecruiterCompanyByUrl() {
        var linkedInslug = $(currentUrlObj).attr('pathname');
        linkedInslug = decodeURIComponent(linkedInslug.split("/")[3]);

        const format = /[ `!@#$%^&*()_+\=\[\]{};':"\\|,.<>\/?~]/;
        if (format.test(linkedInslug)) {
            linkedInslug = encodeURIComponent(linkedInslug);
        }

        message = "getLinkedInCompanyProfile"
        fetchLinkedInByUrl(linkedInslug, message, 3);
    }
    function isLinkedInProfilePage() {
        var currentUrl = currentUrlObj.toString();
        return (currentUrl.indexOf("linkedin.com/recruiter/") > -1 ||
            currentUrl.indexOf("linkedin.com/in/") > -1 ||
            currentUrl.indexOf("linkedin.com/company/") > -1) ||
            currentUrl.indexOf("linkedin.com/sales/people") > -1 ||
            currentUrl.indexOf("linkedin.com/sales/company") > -1 ||
            currentUrl.indexOf("linkedin.com/search/results/") > -1 ||
            (currentUrl.indexOf("linkedin.com/talent/") > -1 && currentUrl.indexOf("/profile/") > -1)
    };
    //-----------------------------------------------LinkedInParsingSectionEnd--------------------------------------------//


    //-----------------------------------------------FaceBookParsingSectionStart------------------------------------------//
    function isFacebookProfilePage() {
        return (fromTopJQcontext("#PagesCoverElementContainerPagelet", true).length || fromTopJQcontext("#fbProfileCover", true).length);
    };
    function parseFacebook() {
        if (fromTopJQcontext("#fbProfileCover").length, true) {
            // var i = document.createElement('iframe');
            // i.style.display = 'none';
            // i.target = "_top";
            // i.src = currentUrlObj;
            // document.body.appendChild(i);
            // i.onload = function () {
            // console.log($('#fbProfileCover [data-tab-key="about"]', i.contentWindow.document));
            // var facebookDetailIinterval = setInterval(() => {
            let btn_about = fromTopJQcontext('#fbProfileCover a[data-tab-key="about"]', true);
            if (btn_about.length) {
                // clearInterval(facebookDetailIinterval);
                fromTopJQcontext('#fbProfileCover [data-tab-key="about"]', true)[0].click();
                var facebookDetailContactsIinterval = setInterval(() => {
                    if (fromTopJQcontext("a._Interaction__ProfileSectionContactBasic").length, true) {
                        clearInterval(facebookDetailContactsIinterval);
                        fromTopJQcontext("a._Interaction__ProfileSectionContactBasic", true).click();
                        var facebookDetailContactsInnerIinterval = setInterval(() => {
                            if (fromTopJQcontext('#pagelet_contact', true).length) {
                                clearInterval(facebookDetailContactsInnerIinterval);
                                fromTopJQcontext('#pagelet_contact .clearfix', true).each(function (element) { console.log($(element).text()) });
                                // i.parentNode.removeChild(i);
                                finishParsing(false);
                            }
                        }, 50);


                    }
                }, 200);

            }
            // }, 250);
            // };
            var bgImage = fromTopJQcontext("#fbProfileCover .profilePicThumb img.silhouette.img", true).length ? "" : fromTopJQcontext("#fbProfileCover .profilePicThumb img.img", true).attr('src');
            if (bgImage != '') {
                profile.image = { "value": bgImage, "type": "image" };
            }
            var name = fromTopJQcontext("#fbProfileCover #fb-timeline-cover-name", true).text();
            setSplitName(name);
            var organisation = fromTopJQcontext('#profile_timeline_intro_card .sp_PcNl_Pzo88k.sx_15b8d3', true);
            if (organisation.length) {
                var position = fromTopJQcontext(organisation[0], true).parent().find('div.textContent').text();
                var indexOfAt = position.indexOf(' at ');
                profile.position = { "value": indexOfAt >= 0 ? position.substr(0, indexOfAt) : position, "type": "input" };
                var organisation = fromTopJQcontext(".pv-top-card-v2-section__company-name", true);
                if (indexOfAt >= 0) {
                    profile.organisation = { "value": position.substr(indexOfAt + 4), "type": "input" };
                } else {
                    profile.organisation = { "value": organisation.text(), "type": "input" };
                }
            }
            finishParsing(true);
        }
        else if (fromTopJQcontext("#pagelet_page_cover")) {
        }
    }
    //-----------------------------------------------FaceBookParsingSectionEnd--------------------------------------------//

    //-----------------------------------------------TwitterParsingSectionStart------------------------------------------//
    function parseTwitter() {

    }
    //-----------------------------------------------TwitterParsingSectionEnd-------------------------------------------//

    //-----------------------------------------------XingParsingSectionStart------------------------------------------//
    function parseXing() {
        if (currentUrlObj.toString().indexOf("xing.com/profile/") > -1) { // Candidate page
            var i = document.createElement('iframe');
            i.style.display = 'none';
            i.src = currentUrlObj;

            i.onload = function () {
                var preXingDetailIinterval = setInterval(() => {
                    if (!i.contentWindow) {
                        return
                    }
                    var xingCvPage = $('#cv-print-header', i.contentWindow.document).length;
                    var slug = window.location.pathname.trimLeft('/').split('/')[2]
                    if (slug || xingCvPage) {
                        clearInterval(preXingDetailIinterval);
                        if (!xingCvPage) {
                            i.src = 'https://www.xing.com/profile/' + slug + "/cv/print";
                        }
                        var xingDetailMainInterval = setInterval(() => {//Keep checking if detail content is loaded clear interval once loaded
                            if ($('.profile-container', i.contentWindow.document).length) {
                                clearInterval(xingDetailMainInterval);
                                var name = $($("#cv-print-header-name", i.contentWindow.document).children('div')[0]).text();
                                var nameParts = name.trim().split(' ');
                                if (nameParts.length > 1) {
                                    var fname = nameParts.join(' ').replace(nameParts[nameParts.length - 1], '').trim();
                                    profile.fname = { "value": fname, "type": "input" };
                                    var lname = nameParts[nameParts.length - 1].trim();
                                    profile.lname = { "value": lname, "type": "input" };
                                } else {
                                    var fname = nameParts[0];
                                    profile.fname = { "value": fname, "type": "input" };
                                    var lname = "";
                                    profile.lname = { "value": lname, "type": "input" };
                                }
                                var location = $("#cv-print-header-contact-data", i.contentWindow.document).text();
                                profile.location = { "value": location.replace(/\s\s+/g, ' '), "type": "input" };
                                var email = $(".mail", i.contentWindow.document).text();
                                profile.email = { "value": email, "type": "input" };
                                var phone = $(".phone", i.contentWindow.document).text();
                                profile.phone = { "value": phone.replace('Phone: ', ''), "type": "input" };
                                var porg = $('#cv-print-header-name .title', i.contentWindow.document).text();
                                var position = "";
                                var location = "";
                                var _position = $('[itemprop="jobTitle"]', i.contentWindow.document);
                                if (_position.length) {
                                    position = _position[0].textContent;
                                }
                                var _organisation = $('#work-experience .job-company-name a[itemprop="name"]', i.contentWindow.document);
                                if (_organisation.length) {
                                    organisation = _organisation[0].textContent;
                                }
                                profile.position = { "value": position, "type": "input" };
                                profile.organisation = { "value": organisation, "type": "input" };

                                var image = $(".user-image", i.contentWindow.document).attr('src');
                                if (image.indexOf('/nobody_m') == -1) {
                                    profile.image = { "value": image, "type": "image" };
                                }

                                // var linkedin = fromTopJQcontext("#topcard div.module-footer ul li.public-profile.searchable a").attr("href");
                                // profile.xing = { "value": linkedin, "type": "input" };
                                i.parentNode.removeChild(i);
                                finishParsing(true);
                            }
                        }, 250);

                    };
                }, 250);
            }

            window.top.document.body.appendChild(i);
        }
        else if (currentUrlObj.toString().indexOf("xing.com/companies/") > -1) { // Company page

            // https://www.xing.com/companies/j%C3%B6rgledergerber-mediagrafischedienstleistungenundprof.luftaufnahmen
            // default-logo
            var cbgImage = fromTopJQcontext(".header-logo-wrapper .header-logo img.media-img").attr('src');
            if (cbgImage != '' && cbgImage.indexOf('default-logo') == -1) {
                profile.cimage = { "value": cbgImage, "type": "image" };
            }
            var cname = fromTopJQcontext("ul .header-logo-wrapper .header-name .organization-name").not('.first-bar').text();
            cname = cname == "" ? fromTopJQcontext(".header .header-logo-wrapper .header-name .organization-name").not('.first-bar').text() : cname;
            profile.cname = { "value": cname, "type": "input" };
            var website = fromTopJQcontext("#contact-info .contact-info--section a[data-tracking-event-name=PropOutboundLinkUrl]").attr('href');
            profile.website = { "value": website, "type": "input" };
            var clocation = "";
            var clocationHtml = fromTopJQcontext("#contact-info .contact-info--section[itemprop=address]");
            if (clocationHtml.length) {
                $('div', clocationHtml).each(function () {
                    clocation += $(this).text() + " ";
                })
            }
            profile.clocation = { "value": clocation.trim(), "type": "input" };
            finishParsing(true);
            $("#company_link").click();
        }
        else {
            finishParsing(true);
        }
    }
    function isXingProfilePage() {
        return (currentUrlObj.toString().indexOf("xing.com/profile/") > -1 || currentUrlObj.toString().indexOf("xing.com/companies/") > -1);
    };
    //-----------------------------------------------XingParsingSectionEnd--------------------------------------------//

    //-----------------------------------------------ZoominfoParsingSectionStart--------------------------------------------//
    function parseZoomInfo() {
        var i = document.createElement('iframe');
        i.style.display = 'none';
        document.body.appendChild(i);
        i.src = "404";
        i.src = currentUrlObj;

        if (currentUrlObj.toString().indexOf("app.zoominfo.com/#/apps/profile/person") > -1) { // Contact

            i.onload = function () {
                var zoomInterval_1 = setInterval(() => {
                    //Stopping parsing
                    clearInterval(zoomInterval_1);

                    var profileDataFromLocalStorage = JSON.parse(localStorage.getItem('zi-RecentlyViewed-people'));
                    var profileData = profileDataFromLocalStorage[0].basic;

                    //Name
                    var name = profileData.firstName + ' ' + profileData.lastName;
                    setSplitName(name);

                    //Position
                    var position = profileData.title;
                    profile.position = { "value": !position?.includes('undefined') ? position : '', "type": "input" };

                    //Email
                    let email = "";
                    if (profileData.email != "-") {
                        email = profileData.email;
                    } else if (profileData.personalEmail != "-") {
                        email = profileData.personalEmail;
                    }
                    if (email?.length && !email?.includes('undefined')) {
                        profile.email = { "value": email ? email?.replace('-', "") : "", "type": "input" };
                    }

                    //Phone
                    let phone = "";
                    if (profileData.mobilePhone != "-") {
                        phone = profileData.mobilePhone;
                    } else if (profileData.phone != "-") {
                        phone = profileData.phone;
                    } else if (profileData.company.phone != "-") {
                        phone = profileData.company.phone;
                    }
                    if (phone?.length && !phone?.includes('undefined')) {
                        profile.phone = { "value": phone ? phone?.replace('-', "") : "", "type": "input" };
                    }

                    //Locality
                    var location = profileData.address?.city + ', ' + profileData.address?.state;
                    if (location?.length && !location?.includes('undefined')) {
                        profile.location = { "value": !location.includes('undefined') ? location : '', "type": "input" };
                    }

                    //Address
                    var address = profileData.displayAddress;
                    if (address?.length && !address?.includes('undefined')) {
                        profile.address = { "value": address, "type": "input" };
                    }

                    //Image
                    var profilePic = profileData.image;
                    if (profilePic && profilePic != '' && profilePic != "/assets/images/company_placeholder.jpg"
                        && profilePic != "https://app.zoominfo.com/assets/images/contact_placeholder.png") {
                        profile.image = { "value": profilePic, "type": "image" };
                    }

                    //Organization
                    var organisation = profileData.company?.name;
                    profile.organisation = { "value": !organisation?.includes('undefined') ? organisation : '', "type": "input" };

                    //Company Name
                    var cname = profileData.company?.name;;
                    profile.cname = { "value": !cname?.includes('undefined') ? cname : '', "type": "input" };

                    //Company Website
                    var website = profileData.company.domain;
                    profile.website = { "value": website?.replace(/\/\/+/, ' '), "type": "input" };

                    //Company Location
                    var clocation = profileData.company.address?.Street + ' ' + profileData.company.address?.City + ' '
                        + profileData.company.address?.State + ' ' + profileData.company.address?.CountryCode;
                    profile.clocation = { "value": !clocation?.includes('undefined') ? clocation : '', "type": "input" };

                    //Company Image
                    var cbgImage = 'https://res.cloudinary.com/zoominfo-com/image/upload/w_80,h_55,c_fit/' + profileData.company.domain?.replace('www.', '');
                    if (cbgImage && cbgImage != '' && cbgImage != "/assets/images/company_placeholder.jpg"
                        && cbgImage != "https://app.zoominfo.com/assets/images/company_placeholder.png") {
                        profile.cimage = { "value": cbgImage, "type": "image" };
                    }

                    finishParsing(true);
                    //Activating Contact Tab
                    $("#contact_link").click();

                }, 250);
            }
        }
        else if (currentUrlObj.toString().indexOf("app.zoominfo.com/#/apps/profile/company") > -1) { // Company page
            i.onload = function () {
                var zoomInterval_1 = setInterval(() => {
                    //Stopping parsing
                    clearInterval(zoomInterval_1);

                    var profileDataFromLocalStorage = JSON.parse(localStorage.getItem('zi-RecentlyViewed-companies'));
                    var profileData = profileDataFromLocalStorage[0].basic;

                    //Company Name
                    var cname = profileData.name;;
                    profile.cname = { "value": !cname.includes('undefined') ? cname : '', "type": "input" };

                    //Company Website
                    var website = profileData.domain;
                    profile.website = { "value": !website.includes('undefined') ? website : '', "type": "input" };

                    //Company Location
                    var clocation = profileData.address?.Street + ' ' + profileData.address?.City + ' '
                        + profileData.address?.State + ' ' + profileData.address?.CountryCode;
                    profile.clocation = { "value": !clocation.includes('undefined') ? clocation : '', "type": "input" };

                    //Company Image
                    var cbgImage = 'https://res.cloudinary.com/zoominfo-com/image/upload/w_80,h_55,c_fit/' + profileData.domain?.replace('www.', '');
                    if (cbgImage && cbgImage != '' && cbgImage != "/assets/images/company_placeholder.jpg"
                        && cbgImage != "https://app.zoominfo.com/assets/images/company_placeholder.png") {
                        profile.cimage = { "value": cbgImage, "type": "image" };
                    }

                    finishParsing(true);
                    //Activating Company Tab
                    $("#company_link").click();

                }, 250);
            }
        }
        else {
            finishParsing(true);
        }
    }

    function parseZoom() {
        var i = document.createElement('iframe');
        i.style.display = 'none';
        document.body.appendChild(i);
        i.src = "404";
        i.src = currentUrlObj;

        if (currentUrlObj.toString().indexOf("go.zoominfo.com/#/apps/search/person/results?personProfileId") > -1) { // Contact
            i.onload = function () {
                var zoomInterval_1 = setInterval(() => {
                    if ($('.profile-container', i.contentWindow.document).length) {
                        clearInterval(zoomInterval_1);
                        var name = $('.person-row-container .person-name', i.contentWindow.document).text();
                        setSplitName(name);
                        var position = $('.person-row-container .person-title', i.contentWindow.document).text();
                        profile.position = { "value": position, "type": "input" };
                        var organisation = $('.person-row-container .company-name-link', i.contentWindow.document).text();
                        profile.organisation = { "value": organisation, "type": "input" };
                        var zoomInterval_2_count = 0;
                        var zoomInterval_2 = setInterval(() => {
                            var email = $(".contact-details-content .email-section .business-email a.email-link", i.contentWindow.document);
                            if (email.length || zoomInterval_2_count >= 5) {
                                clearInterval(zoomInterval_2);
                                if (email.length) {
                                    email = $(".contact-details-content .email-section .business-email a.email-link", i.contentWindow.document).attr('href');
                                    profile.email = { "value": email ? email.replace('mailTo:', "") : "", "type": "input" };
                                }
                                var _phone = $(".contact-details-content .contact-details-grid .phone-section", i.contentWindow.document);
                                if (_phone.length) {
                                    var phone = $("a", _phone.children()[1]).attr('href');
                                    profile.phone = { "value": phone ? phone.replace('tel:', "") : "", "type": "input" };
                                }
                                var location = $('#primaryLocation .location-content', i.contentWindow.document);
                                if (location.length) {
                                    profile.location = { "value": location[0].textContent.replace(/\s\s+/g, ' '), "type": "input" };
                                }
                                // var linkedin = $('.contactProfile .contact-details i.linkedin_icon', i.contentWindow.document);
                                // if (linkedin.length) {
                                //     linkedin = $(linkedin[0]).parent('a');
                                //     if (linkedin.length) {
                                //         linkedin = $(linkedin[0]).attr('href');
                                //     }
                                // }
                                // profile.linkedin = { "value": linkedin, "type": "input" };
                                if ($('#Company-Overview-0', i.contentWindow.document).length) {
                                    $('#Company-Overview-0', i.contentWindow.document).click();
                                    var company_zoomInterval_1 = setInterval(() => {
                                        if ($('.profile-container', i.contentWindow.document).length) {
                                            clearInterval(company_zoomInterval_1);
                                            var cname = $('.profile-container .company-name .primary-name', i.contentWindow.document).text();
                                            profile.cname = { "value": cname, "type": "input" };
                                            var website = $(".profile-container #company-domain a", i.contentWindow.document).attr('href');
                                            profile.website = { "value": website.replace(/\/\/+/, ' '), "type": "input" };
                                            var company_zoomInterval_2_count = 0;
                                            var company_zoomInterval_2 = setInterval(() => {
                                                var clocation = $(".profile-container #company-hq-address", i.contentWindow.document).text();
                                                if ((clocation && clocation.trim()) || company_zoomInterval_2_count >= 4) {
                                                    clearInterval(company_zoomInterval_2);
                                                    var cbgImage = $(".profile-container .company-logo img", i.contentWindow.document).attr('src');
                                                    if (cbgImage != '' && cbgImage != "/assets/images/company_placeholder.jpg") {
                                                        profile.cimage = { "value": cbgImage, "type": "image" };
                                                    }
                                                    profile.clocation = { "value": clocation.replace(/\s\s+/g, ' '), "type": "input" };
                                                    i.parentNode.removeChild(i);
                                                    finishParsing(true);
                                                    $("#company_link").click();
                                                }
                                                company_zoomInterval_2_count++;
                                            }, 150);
                                        }
                                    }, 250);
                                } else {
                                    i.parentNode.removeChild(i);
                                    finishParsing(true);
                                    $("#contact_link").click();
                                }
                            }
                            zoomInterval_2_count++;
                        }, 500);
                    }
                }, 250);
            }
        }
        else if (currentUrlObj.toString().indexOf("go.zoominfo.com/#/apps/search/company/results?companyProfileId") > -1) { // Company page
            i.onload = function () {
                var zoomInterval_1 = setInterval(() => {
                    if ($('.profile-container', i.contentWindow.document).length) {
                        clearInterval(zoomInterval_1);
                        var cname = $('.profile-container .company-name .primary-name', i.contentWindow.document).text();
                        profile.cname = { "value": cname, "type": "input" };
                        var website = $(".profile-container #company-domain a", i.contentWindow.document).attr('href');
                        profile.website = { "value": website.replace(/\/\/+/, ' '), "type": "input" };
                        var zoomInterval_2_count = 0;
                        var zoomInterval_2 = setInterval(() => {
                            var clocation = $(".profile-container #company-hq-address", i.contentWindow.document).text();
                            if ((clocation && clocation.trim()) || zoomInterval_2_count >= 4) {
                                clearInterval(zoomInterval_2);
                                var cbgImage = $(".profile-container .company-logo img", i.contentWindow.document).attr('src');
                                if (cbgImage != '' && cbgImage != "/assets/images/company_placeholder.jpg") {
                                    profile.cimage = { "value": cbgImage, "type": "image" };
                                }
                                profile.clocation = { "value": clocation.replace(/\s\s+/g, ' '), "type": "input" };
                                i.parentNode.removeChild(i);
                                finishParsing(true);
                                $("#company_link").click();
                            }
                            zoomInterval_2_count++;
                        }, 150);
                    }
                }, 250);
            }
        }
        else {
            finishParsing(true);
        }
    }

    function isZoomInfoProfilePage() {
        return (currentUrlObj.toString().indexOf("app.zoominfo.com/#/apps/profile/person") > -1 ||
            currentUrlObj.toString().indexOf("app.zoominfo.com/#/apps/profile/company") > -1);
    };

    function isZoomProfilePage() {
        return (currentUrlObj.toString().indexOf("go.zoominfo.com/#/apps/search/person/results?personProfileId=") > -1 ||
            currentUrlObj.toString().indexOf("go.zoominfo.com/#/apps/search/company/results?companyProfileId=") > -1);
    };
    //-----------------------------------------------ZoominfoParsingSectionEnd--------------------------------------------//

    //-----------------------------------------------IndeeParsingSectionStart--------------------------------------------//
    function isIndeedProfilePage() {
        return (currentUrlObj.toString().indexOf("employers.indeed.com/c#candidates/view") > -1)
    };
    function parseIndeed() {
        var topDocFrameCounter = 0;
        var indeedCheks = { phone: false, email: false };
        var topDocFrameInterval = setInterval(() => {
            topDocFrameCounter++;
            if (fromTopJQcontext("#candidateDetails", true).length) {
                clearInterval(topDocFrameInterval);
                var name = fromTopJQcontext('.candidate-info-bar-left .name').text();
                setSplitName(name);
                var position = fromTopJQcontext('.candidate-info-bar-left .job-title', true).text();
                profile.position = { "value": position, "type": "input" };
                var location = fromTopJQcontext('.candidate-info-bar-left .location', true).text();
                profile.location = { "value": location, "type": "input" };
                if (fromTopJQcontext('#candidate-phone', true).length) {
                    fromTopJQcontext('#candidate-phone', true).click();
                    var phnIntercalCount = 0;
                    var indedPhnInterval = setInterval(() => {
                        phnIntercalCount++;
                        if (fromTopJQcontext("#report-call-candidate-head-form", true).length) {
                            clearInterval(indedPhnInterval);
                            indeedCheks.phone = true;
                            var phone = fromTopJQcontext("#report-call-candidate-head-form", true).text();
                            profile.phone = { "value": phone, "type": "input" };
                        } else {
                            if (phnIntercalCount > 20) {
                                clearInterval(indedPhnInterval);
                                indeedCheks.phone = true;
                            }
                        }
                    }, 100);
                } else {
                    indeedCheks.phone = true;
                }
                if (fromTopJQcontext("#resumePanel", true).length) {
                    var emailIntercalCount = 0;
                    var indedemailInterval = setInterval(() => {
                        emailIntercalCount++;
                        if (fromTopJQcontext(".rdp-resume-container", true).length) {
                            clearInterval(indedemailInterval);
                            var resumeText = fromTopJQcontext(".rdp-resume-container", true).text();
                            if (resumeText) {
                                var emailPattern = /[\p{L}\p{N}_\*,\+.-]+@[\p{L}\p{N}-]+\.[\p{L}]{2,}(\.[\p{L}]{2,})?/u;
                                var email = emailPattern.exec(resumeText);
                                if (email && email[0]) {
                                    profile.email = { "value": email[0], "type": "input" };
                                }
                                profile.fullResumeText = { "value": resumeText, "type": "longText" };
                            }
                            indeedCheks.email = true;
                        } else {
                            if (emailIntercalCount > 20) {
                                clearInterval(indedemailInterval);
                                indeedCheks.email = true;
                            }
                        }
                    }, 100);
                } else {
                    indeedCheks.email = true;
                }

                var indeedCheckInterval = setInterval(() => {
                    for (var check in indeedCheks) {
                        if (!indeedCheks[check]) {
                            return;
                        }
                    }
                    clearInterval(indeedCheckInterval);
                    finishParsing(true);
                }, 750);
            } else {
                if (topDocFrameCounter > 30) {
                    clearInterval(topDocFrameInterval);
                    finishParsing(true);
                }
            }
        }, 150);
    }
    //-----------------------------------------------IndeeParsingSectionEnd--------------------------------------------//

    //-----------------------------------------------GmailSectionEnd--------------------------------------------//

    function isGmailThreadPage() {
        return (currentUrlObj.toString().indexOf("https://mail.google.com/mail/u/0/" > -1))
    };
    function parseGmail() {
        var userEmail = fromTopJQcontext('head').attr('data-inboxsdk-user-email-address');
        var sender = fromTopJQcontext('.gE.iv.gt .gD');
        if (sender && sender.attr('email') != userEmail) {
            var name = sender.attr('name');
            setSplitName(name);
            var email = sender.attr('email');
            profile.email = { "value": email, "type": "input" };
            var image = fromTopJQcontext('#\\:1r_1-e').attr('src');
            if (image && image != '//ssl.gstatic.com/ui/v1/icons/mail/profile_mask2.png') {
                profile.image = { "value": image, "type": "image" };
            }
            finishParsing(true);
        } else {
        }
    }
    //-----------------------------------------------GmailSectionEnd--------------------------------------------//

    //-----------------------------------------------OutlookSectionEnd--------------------------------------------//

    function isOutlookThreadPage() {
        return (
            currentUrlObj.toString().indexOf("https://outlook.live.com/mail") > -1 ||
            currentUrlObj.toString().indexOf("https://outlook.office365.com/mail") > -1 ||
            currentUrlObj.toString().indexOf("https://outlook.office.com/mail") > -1 ||
            currentUrlObj.toString().indexOf("https://outlook.microsoft365.com/mail") > -1 ||
            currentUrlObj.toString().indexOf("https://outlook.microsoft.com/mail") > -1
        )
    };
    function parseOutlook() {
        var parsed = false;
        var currentUrl = currentUrlObj.toString();
        // if (currentUrl.indexOf("https://outlook.office.com/") > -1) {
        if (currentUrl.indexOf("https://outlook.live.com/") > -1) {

            var currentSelectedMail = fromTopJQcontext("._3BpnlUwgtfNUWLoQytJYRy");
            var nameDivText = $('._3cCT-sJc1vQdLHJYCtN_YY', currentSelectedMail);
            if (nameDivText.length) {
                var data = nameDivText.text().replace('[Draft]', "");

                var name = data.substr(0, data.lastIndexOf('<')).trim();
                var email = data.substr(data.lastIndexOf('<')).replace(">", "").replace("<", "").trim();
            } else {
                var name = $('._3zJzxRam-s-FYVZNqcZ0BW', currentSelectedMail).text();
                var email = $('._3zJzxRam-s-FYVZNqcZ0BW span', currentSelectedMail).attr('title');
            }
            var image = $('img.ms-Image-image.ms-Image-image--portrait', currentSelectedMail).attr('src');
        } else {
            // var emailthreads = fromTopJQcontext('.B1IVVpQay0rPzznhParFr');
            var emailthreads = fromTopJQcontext('._3BpnlUwgtfNUWLoQytJYRy');
            if (emailthreads.length) {
                // var userEmail = fromTopJQcontext('._3OhYOe1wotB0LNRbjEDfz9').text();
                $(emailthreads).each(function () {
                    if (parsed) {
                        return false;
                    }
                    var currecntEmail = $(this).find('div.VHquDtYElxQkNvZKxCJct').text();
                    var name = currecntEmail.substr(0, currecntEmail.lastIndexOf('<')).trim();
                    var email = currecntEmail.substr(currecntEmail.lastIndexOf('<')).replace(">", "").replace("<", "").trim();
                    var image = $('img.ms-Image-image--cover.ms-Image-image', $(this)).attr('src');
                    parsed = true;
                    //     var image = fromTopJQcontext('#\\:1r_1-e').attr('src');
                    // if(sender && sender.attr('email') != userEmail){
                    //     var name = sender.attr('name');
                    //     profile.name = { "value": name, "type": "input" };
                    //     var email = sender.attr('email');
                    //     profile.email = { "value": email, "type": "input" };
                    //     
                    // }else{
                    // }
                });
            }
        }
        if (email) {
            profile.email = {
                "value": email,
                "type": "input"
            };
        }
        if (name) {
            setSplitName(name);
        }
        if (image) {
            profile.image = {
                "value": image,
                "type": "image"
            };
        }
        finishParsing(true);
    }
    //-----------------------------------------------OutlookSectionEnd--------------------------------------------//


    //-----------------------------------------------ParsingSectionEnd----------------------------------------------------//

    //-----------------------------------------------EventListnersSectionStart----------------------------------------------//
    window.addEventListener('message', function (message) {
        switch (message.data.message) {
            case "getSFSettings":
              sfusersettings = message.data.response; // Get SF settings data
              // Store settings in local storage 
              storeInLocalStorage("SFUserSettings", sfusersettings);
              break;
            case "getUserFinished":
                userCallFinished = true;
                response = JSON.parse(message.data.response);
                extSettings = {}
                if (response.status == "success") {
                    user = response.user;
                    extSettings = getFromLocalStorage();

                    //Setting override data in case override is not available in cookies
                    if (typeof (extSettings.overrideData) == "undefined") {
                        storeInLocalStorage("overrideData", true)
                    }

                    checkEverytingLoaded();
                    // populateNotifications(response.notifications);
                    // setNotificationUi();
                } else {
                    setFrameLoadedState();
                }
                break;
            case "getLinkedInPersonProfileFinished":
                userCallFinished = true;
                if (message.data.response) {
                    response = message.data.response;
                    return extractPersonFromLinkedInResponse(response);
                }
                finishParsing(true);
                break;
            case "getLinkedInCompanyProfileFinished":
                userCallFinished = true;
                if (message.data.response) {
                    response = message.data.response;
                    return extractCompanyFromLinkedInResponse(response);
                }
                finishParsing(true);
                break;
            case "getLinkedInPersonProfilePdfFinished":
                userCallFinished = true;
                if (message.data.response && message.data.response.base64profile) {
                    base64Text = message.data.response.base64profile || ''
                }
                if (message.data.response.tooManyReq) {
                    toastr.error("Failed to upload profile pdf");
                }
                createCandidateRecord(true);
                break;
            case "urlchanged":
                if (message.data.linkedInCtp) {
                    ctp[window.top.document.domain] = true
                } else {
                    ctp[window.top.document.domain] = false
                    currentUrlObj = window.top.location
                }
                if (slugChanged()) {
                    get_user();
                }
                previousUrl = JSON.parse(JSON.stringify(currentUrlObj));
                if (typeof (previousUrl) != "object") {
                    previousUrl = new URL(previousUrl);
                }
                break;
            case "addToHotListFinished":
                stopProcessing('#btn_add_to_hot_list');
                response = JSON.parse(message.data.response);
                if (response.status == "success") {
                    if (response.data.length > 0) {
                        if (response.data.hotlist.entityname == 'candidates') {
                            hotlists['candidate'].push(response.data.hotlist);
                        }
                        if (response.data.hotlist.entityname == 'contacts') {
                            hotlists['contact'].push(response.data.hotlist);
                        }
                        if (response.data.hotlist.entityname == 'companies') {
                            hotlists['company'].push(response.data.hotlist);
                        }
                    }
                    toastr.success(response.message);
                    $('#add_to_hot_list_followup .close-modal').click();
                } else {
                    toastr.error(response.message);
                }
                break;
            case "assignCandidateToJobFinished":
                stopProcessing('#btn_assign_to_job');
                $(jobSelectId).val('');
                response = JSON.parse(message.data.response);
                if (response.status == "success") {
                    toastr.success(response.message);
                    $('#update_hiring_stage_tooltip .h-p-close').click();
                    $('#assign_to_job_followup .close-modal').click();
                } else {
                    toastr.error(response.message);
                }
                break;
            case "submitCandidateFinished":
                submitSuccessHandler(message, 'candidate')
                break;
            case "submitCandidateErrorFinished":
                submitSuccessHandler(message, 'candidateerror')
                break;    
            case "submitContactFinished":
                submitSuccessHandler(message, 'contact')
                break;
            case "submitCompanyContactFinished":
                submitSuccessHandler(message, 'company')
                break;
            case "submitSettingsFinished":
                submitSuccessHandler(message, 'settings')
                break;    
            case "getCompaniesFinished":
                $('#companies_list').children().remove();
                response = JSON.parse(message.data.response);
                if (response.status == "success") {
                    response.data.forEach(function (company) {
                        var option = document.createElement('option');
                        option.value = company.title;
                        option.setAttribute('data-id', company.id);
                        $('#companies_list').append(option)
                    });
                    $(".search-company-loader").removeClass("d-block").addClass("d-none");
                }
                break;
            case "submitAppointmentFinished":
                stopProcessing('#appointment_form button[type=submit]');
                response = JSON.parse(message.data.response);
                if (response.status == "success") {
                    toastr.success(response.message);
                    $('#add_appointment_followup .close-modal').click();
                    reset_appointment_form()
                } else {
                    toastr.error(response.message);
                }
                break;
            case "submitTaskFinished":
                stopProcessing('#task_form button[type=submit]');
                response = JSON.parse(message.data.response);
                if (response.status == "success") {
                    toastr.success(response.message);
                    $('#add_task_followup .close-modal').click();
                    reset_task_form()
                } else {
                    toastr.error(response.message);
                }
                break;
            case "getJobsToAssignCandidateFinished":
                if (message.data.isDataObj) {
                    response = message.data.response;
                } else {
                    response = JSON.parse(message.data.response);
                }
                if (response.status == "success") {
                    jobs = response.data.jobs;
                    var options = '';

                    jobs.forEach(function (job) {
                        options += '<option value = ' + job.id + '>' + HtmlEncode(job.jobname) + ' ' + (job.companyname ? '(' + HtmlEncode(job.companyname) + ')' : '') + ' ' + (job.city ? '- ' + HtmlEncode(job.city) : '') + '</option>';
                    });
                    $(jobSelectId).empty().append(options);
                    $(jobSelectId).trigger("change");

                    sendMessageToParent({ 'message': 'getJobsToAssignCandidateForEmailTrigger' });

                    if (EventListnsers.indexOf("#btn_assign_to_job") == -1 && ("#btn_assign_to_job").length > 0) {
                        $("#btn_assign_to_job").on("click", function () {
                            if ($(jobSelectId).val().length) assignToJob();
                            else {
                                toastr.info("At Least one Job Must Be Selected")
                            }
                        });
                        EventListnsers.push("#btn_assign_to_job");
                    }
                }
                break;
            case "getJobsToAssignCandidateForEmailTriggerFinished":
                if (message.data.isDataObj) {
                    response = message.data.response;
                } else {
                    response = JSON.parse(message.data.response);
                }

                if (response.data.emailtrigger.length > 0) {
                    $('#send_email_trigger_checkbox_div').show();
                    $('#send_email_trigger_checkbox').prop('checked', true);
                    $('#send_email_trigger_checkbox_label').html('Send ' + response.data.emailtrigger[0].name + ' Email');
                }
                break;
            case "assignCandidateToJobCheckForEmailTrigger":
                response = JSON.parse(message.data.response);

                if ($('#send_email_trigger_checkbox')) {
                    if ($('#send_email_trigger_checkbox').is(":checked")) {
                        sendEmailTrigger('assignCandidateToJobEmailTrigger', 1, 1, [candidate], 5, $(jobSelectId).val(), message.data.response, response.data.failedRecords, 'bulk');
                    } else {
                        this.window.postMessage({ "message": "assignCandidateToJobFinished", 'isDataObj': true, "response": message.data.response });
                    }
                } else {
                    this.window.postMessage({ "message": "assignCandidateToJobFinished", 'isDataObj': true, "response": message.data.response });
                }
                break;
            case "getHotlistsFinished":
                if (message.data.isDataObj) {
                    response = message.data.response;
                } else {
                    response = JSON.parse(message.data.response);
                }
                if (response.status == "success" || response.data.length) {
                    hotlists[message.data.entity] = response.data;
                    setHotListSelectOptions(message.data.entity);
                }
                break;
            case "checkDuplicateFinished":
                response = JSON.parse(message.data.response);
                setTimeout(() => {
                    $('.exists-message-container').children('div').toggleClass('d-block', false).toggleClass('d-none', true);
                    $('.exists-message-container').toggleClass('slidedown', false);
                    $('.form-container').toggleClass('slidedown', false);

                    if (response.status == "success") {
                        if (response.data.candidate && response.data.candidate.id != undefined && response.data.candidate.id != "" && response.data.candidate.id != 0) {
                            candidate = response.data.candidate;
                            candidateNotes = response.data.candidate_notes
                            $('#candidate .exists-message-container .exists-link').attr('href', BASE_APP_URL + '/candidate/' + response.data.candidate.slug);
                            $('#candidate .exists-message-container .exists').toggleClass('d-block', true).toggleClass('d-none', false);
                            this.window.postMessage({ "message": "getJobsToAssignCandidateFinished", 'isDataObj': true, "response": response });
                            this.window.postMessage({ "message": "getHotlistsFinished", 'isDataObj': true, "response": { "data": response.data.candidate_hotlist }, 'entity': 'candidate' });
                        } else {
                            $('#candidate .exists-message-container .not-exists').toggleClass('d-block', true).toggleClass('d-none', false);
                        }
                        if (response.data.contact && response.data.contact.id != undefined && response.data.contact.id != "" && response.data.contact.id != 0) {
                            contact = response.data.contact;
                            contactNotes = response.data.contact_notes

                            $('#contact .exists-message-container .exists-link').attr('href', BASE_APP_URL + '/contact/' + response.data.contact.slug);
                            $('#contact .exists-message-container .exists').toggleClass('d-block', true).toggleClass('d-none', false);
                            this.window.postMessage({ "message": "getHotlistsFinished", 'isDataObj': true, "response": { "data": response.data.contact_hotlist }, 'entity': 'contact' });

                        } else {
                            $('#contact .exists-message-container .not-exists').toggleClass('d-block', true).toggleClass('d-none', false);
                        }
                        if (response.data.company && response.data.company.id != undefined && response.data.company.id != "" && response.data.company.id != 0) {
                            company = response.data.company;

                            $('#company .exists-message-container .exists-link').attr('href', BASE_APP_URL + '/company/' + response.data.company.slug);
                            $('#company .exists-message-container .exists').toggleClass('d-block', true).toggleClass('d-none', false);
                            // this.window.postMessage({ "message": "getHotlistsFinished", 'isDataObj': true, "response": { "data": response.data.contact_hotlist }, 'entity': 'contact' });

                        } else {
                            $('#company .exists-message-container .not-exists').toggleClass('d-block', true).toggleClass('d-none', false);
                        }
                        // setFrameLoadedState();
                    } else {
                        $('#candidate .exists-message-container .not-exists').toggleClass('d-block', true).toggleClass('d-none', false);
                        $('#contact .exists-message-container .not-exists').toggleClass('d-block', true).toggleClass('d-none', false);
                        $('#company .exists-message-container .not-exists').toggleClass('d-block', true).toggleClass('d-none', false);
                    }
                }, 1250);
                break;
            case "getHiringStagesFinished":
                var response = JSON.parse(message.data.response);
                if (response.status == 'success' && response.data.hiringPipelineStages.length) {
                    hiringStages = response.data.hiringPipelineStages
                }
                break;
            case "getHiringStagesEmailTriggerFinished":
                var response = JSON.parse(message.data.response);
                if (response.status == 'success' && response.data.length) {
                    hiringStageTriggers = response.data;
                }
                break;
            case "getAssignedJobsFinished":
                var response = JSON.parse(message.data.response);
                var presetEntity = {};
                presetEntity.candidate = window['candidate'];
                var options = $('#assign_to_job_followup option');
                if (options.length) {
                    options.removeAttr('disabled');
                }
                $('.assign_to_job_followup_presigned').toggleClass('d-none', true).toggleClass('d-block', false);
                $('.assign_to_job_followup_preigned_empty').toggleClass('d-none', true).toggleClass('d-block', false);
                if (response.status == 'success' && response.data.jobs.length) {
                    var jobsLi = ''
                    assignedJobs = response.data.jobs
                    assignedJobs.forEach(assignedJob => {
                        if (jobs.length) {
                            jobs.forEach(job => {
                                if (job.id == assignedJob.jobid) {
                                    $('#assign_to_job_followup option[value="' + job.id + '"]').attr('disabled', 'disabled');
                                    var logoHtml = '<p class="image avatar-35 bg-company color-company m-r-5"><i class="mdi mdi-domain material-icons"></i> </p>';
                                    var companyHtml = '<span><i class ="mdi mdi-domain material-icons m-r-5"></i>Not avaialble</span>'
                                    var cityHtml = '<span><i class="mdi mdi-map-marker material-icons m-r-5"></i>Not available</span>'

                                    var jobName = (job.jobname && job.jobname.length > 14) ? HtmlEncode(job.jobname).substring(0, 15) + '..' : HtmlEncode(job.jobname);
                                    var stageName = (!assignedJob.candidatestatus) ? 'Not Available' : (assignedJob.candidatestatus && assignedJob.candidatestatus.length > 14) ? HtmlEncode(assignedJob.candidatestatus).substring(0, 15) + '..' : HtmlEncode(assignedJob.candidatestatus);

                                    var src = assignedJob.companylogo ? assignedJob.companylogo : "";
                                    if (assignedJob.companylogo) {
                                        src = assignedJob.companylogo.split(',')[0];
                                        if (assignedJob.companylogo.search('clearbit') > 0) {
                                            src = assignedJob.companylogo;
                                        }
                                    }
                                    if (src != "") {
                                        logoHtml = '<p class="image avatar-35 bg-company color-company m-r-10"><image class="avatar-35 bg-company" style="width:100%" src="' + src + '"></image> </p>';
                                    }
                                    if (assignedJob.companyslug && assignedJob.companyslug != "") {
                                        var companyName = (assignedJob.companyname && assignedJob.companyname.length >= 14) ? HtmlEncode(assignedJob.companyname).substring(0, 15) + '..' : HtmlEncode(assignedJob.companyname);
                                        companyHtml = '<i class ="mdi mdi-domain material-icons"></i>' +
                                            '<a class="m-l-5" href="' + BASE_APP_URL + '/company/' + assignedJob.companyslug + '" target="_blank" title = "' + HtmlEncode(assignedJob.companyname) + '">' +
                                            companyName +
                                            '</a>';
                                    }
                                    if (job.city && job.city != "") {
                                        var cityName = (job.city && job.city.length >= 12) ? HtmlEncode(job.city).substring(0, 12) + '..' : HtmlEncode(job.city);
                                        cityHtml = '<span title="' + HtmlEncode(job.city) + '"><i class="mdi mdi-map-marker material-icons m-r-5"></i>' + HtmlEncode(cityName) + '</span>'
                                    }
                                    jobsLi += '<li>' +
                                        '<div class="d-flex align-items-center">' +
                                        '<div>' +
                                        logoHtml +
                                        '</div>' +
                                        '<div class="d-flex flex-direction-col">' +
                                        '<div class="m-b-2 d-flex align-items-center">' +
                                        '<a href="' + BASE_APP_URL + '/job/' + job.slug + '" target="_blank" title="' + HtmlEncode(job.jobname) + '" class="m-r-2">' +
                                        jobName +
                                        '</a>' +
                                        cityHtml +
                                        '<div id="remarks" class="rounded-circle-avatar m-r-5 tooltip m-l-5" title=\"' + ((assignedJob.remark != null && assignedJob.remark != '') ? HtmlEncode(assignedJob.remark) : 'No Remark') + '\">' +
                                        '<span class="rounded-circle-avatar-title">' +
                                        '<i class="mdi mdi-message-text"></i>' +
                                        '</span>' +
                                        '</div>' +
                                        '</div>' +
                                        '<div class="m-t-2 d-flex align-items-center">' +
                                        companyHtml +
                                        '<p title="' + HtmlEncode(assignedJob.candidatestatus ?? 'Not Available') + '">' +
                                        '<a class="rcrm-tag hiring-tooltip-popup m-l-5" title="' + HtmlEncode(assignedJob.candidatestatus ?? "Not Available") + '" id="h_p_' + job.id + '" data-tooltip-content="#update_hiring_stage_tooltip" data-jobid="' + job.id + '" >' +
                                        stageName +
                                        '</a>' +
                                        '</p>' +
                                        '</div>' +
                                        '<div>' +
                                        '</div>' +
                                        '</li>';

                                }
                            });
                        }
                    });
                    $('.assign_to_job_followup_presigned').toggleClass('d-none', false).toggleClass('d-block', true);
                    $('.presigned-jobs-list').html(jobsLi);
                    // Since the tooltipster removes all the html in template, the actual html is maintained in a shadow element
                    // Copy that to template before initiializing
                    $('#h_s_tooltip_template').html($('#h_s_tooltip_template_shadow').html());
                    $('#h_s_tooltip_template [data-role="shadow"]').each((i, e) => {
                        e.id = $(e).attr('data-id')
                    });

                    $('#assign_to_job_followup a.close-modal').click(function () {
                        $('#update_hiring_stage_tooltip .h-p-close').click();
                    });

                    $('.hiring-tooltip-popup tooltipstered').tooltipster('destroy');
                    setTimeout(() => {
                        $('.hiring-tooltip-popup').tooltipster({
                            theme: 'tooltipster-shadow',
                            animation: 'fade',
                            interactive: true,
                            trigger: 'click',
                            autoClose: 'false',
                            trigger: 'custom',
                            // new function here 
                            functionReady: function () {
                                $("textarea#remark").on('input', function () {
                                    $('span#remarksLendth').html($('textarea#remark')[1].value.length);
                                });

                                // register all events here after the tooltip popup is ready
                                fnsetUpFollowupControls("#update_hiring_stage_tooltip", {}, true);
                                $('.h-p-close').click(function () {
                                    $('.hiring-tooltip-popup').tooltipster('hide');
                                });
                                $("#update_hiring_stage_tooltip #candidatestatusid")
                                    .empty()
                                var selectedAssignedJob = assignedJobs.filter((asJob) => asJob.jobid == selectedJobId)[0]
                                selectedAssignmentId = selectedAssignedJob.id
                                hiringStages.forEach(stage => {
                                    var seleceted = (stage.id == selectedAssignedJob.candidatestatusid) ? "selected" : "";
                                    if (stage.id == selectedAssignedJob.candidatestatusid) {
                                        setEmailTriggerInputWhileChangeInHiringStage(stage.id);
                                    }
                                    var optHrml = '<option value="' + stage.id + '" ' + seleceted + '>' + HtmlEncode(stage.label) + '</option>'
                                    $("#update_hiring_stage_tooltip #candidatestatusid").append(optHrml)
                                });

                                $("#update_hiring_stage_tooltip #candidatestatusid").on("change", function (e) {
                                    setEmailTriggerInputWhileChangeInHiringStage($('#update_hiring_stage_tooltip #candidatestatusid')[0].value);
                                });

                                $('#update_hiring_stage_tooltip #update_hiring_stage_from').on('submit', function (e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsProcessing('#update_hiring_stage_from button[type=submit]');
                                    var formData = $("#update_hiring_stage_from").serializeArray();
                                    updatedStage = {};
                                    Object.keys(formData).forEach(key => {
                                        updatedStage[formData[key].name] = formData[key].value;
                                    });
                                    updatedStage.id = selectedAssignmentId
                                    updatedStage.stagedate = parseInt(new Date(updatedStage.stagedate).getTime() / 1000)
                                    sendMessageToParent({
                                        "message": "updateHiringStage",
                                        "payload": updatedStage
                                    });
                                });
                            }
                        });
                        $('.hiring-tooltip-popup').on('click', (function () {
                            selectedJobId = $(this).data('jobid')
                            $('.hiring-tooltip-popup').tooltipster('hide');//Close all hiring stage popups
                            $("#h_p_" + selectedJobId).tooltipster('show');

                        }))
                    }, 0);
                } else {
                    $('.assign_to_job_followup_preigned_empty').toggleClass('d-none', false).toggleClass('d-block', true);
                }
                fnsetUpFollowupControls('#assign_to_job_followup', presetEntity, true);
                setEventListners()
                break;
            case "getHotlistsBeforeGetAssignedHotlistsFinished":
                sendMessageToParent({ 'message': 'geAssignedtHotlists', "entity": message.data.entity, 'data': { 'relatedtoid': window[message.data.entity]['id'], 'pagename': message.data.entity == 'company' ? 'companies' : message.data.entity + 's' } });
                break;
            case "geAssignedtHotlistsFinished":
                response = JSON.parse(message.data.response);
                if (response.status == "success") {
                    var presetEntity = {};
                    presetEntity.candidate = window['candidate'];
                    var options = $('#add_to_hot_list_followup option');
                    if (options.length) {
                        options.removeAttr('disabled');
                    }
                    $('.add_to_hot_list_followup_presigned').toggleClass('d-none', true).toggleClass('d-block', false);
                    $('.add_to_hot_list_followup_preigned_empty').toggleClass('d-none', true).toggleClass('d-block', false);
                    if (response.status == 'success' && response.data.hotlists.length) {
                        var hotlistsLi = ''
                        response.data.hotlists.forEach(assignedHL => {
                            if (hotlists[message.data.entity].length) {
                                hotlists[message.data.entity].forEach(hotlist => {
                                    if (hotlist.id == assignedHL.id) {
                                        $('#add_to_hot_list_followup option[value="' + hotlist.id + '"]').attr('disabled', 'disabled');
                                    }
                                });
                            }

                            hotlistsLi += '<li>' + assignedHL.name + '</li>';
                        });
                        $('.add_to_hot_list_followup_head').css('display', 'block');
                        $('.add_to_hot_list_followup_presigned').toggleClass('d-none', false).toggleClass('d-block', true);
                        $('.presigned-hotlists-list').html(hotlistsLi);
                    } else {
                        $('.add_to_hot_list_followup_head').css('display', 'none');
                        $('.add_to_hot_list_followup_preigned_empty').toggleClass('d-none', false).toggleClass('d-block', true);
                    }
                    fnsetUpFollowupControls('#add_to_hot_list_followup', presetEntity, true);
                }

                break;
            case "updateHiringStageCheckForEmailTrigger":
                if ($('#update_hiring_stage_tooltip #trigger_hiring_update_email')) {
                    if ($('#update_hiring_stage_tooltip #trigger_hiring_update_email').is(":checked")) {
                        sendEmailTrigger(
                            'updateHiringStageEmailTrigger',
                            1,
                            $('#update_hiring_stage_tooltip #candidatestatusid')[0].value,
                            {
                                candidateslug: window['candidate']['slug'],
                                emailid: window['candidate']['emailid'],
                                ...assignedJobs.find((job) => job.jobid == selectedJobId)
                            },
                            5,
                            null,
                            message.data.response,
                            null,
                            'single'
                        );
                    } else {
                        this.window.postMessage({ "message": "updateHiringStageFinished", 'isDataObj': true, "response": message.data.response });
                    }
                } else {
                    this.window.postMessage({ "message": "updateHiringStageFinished", 'isDataObj': true, "response": message.data.response });
                }
                break;
            case "updateHiringStageFinished":
                response = JSON.parse(message.data.response);
                if (response.status == "success") {
                    toastr.success(response.message);
                    sendMessageToParent({ 'message': 'getAssignedJobs', 'data': { 'id': candidate.id } });
                }
                break;
        }
    });
    //-----------------------------------------------EventListnersSectionEnd----------------------------------------------//

    function toggleTabs(evt, tab, sub = false) {
        var contentClass = ".tabcontent"; var linkClass = ".tablinks"; var contentID = "#" + tab;
        if (sub) {
            contentClass = ".subtabcontent"; linkClass = ".subtablinks";
        }
        $(contentClass).each(function () { $(this).toggleClass('d-none', true).toggleClass('d-block', false); });
        $(linkClass).each(function () { $(this).toggleClass("active", false); })
        $(contentID).toggleClass('d-block', true).toggleClass('d-none', false);
        $(evt.currentTarget).toggleClass("active", true);
        if (!sub) {
            if ($(contentID).find(".subtablinks").length) {
                $(contentID).find(".subtablinks")[0].click();
            }
        }
    }

    const debounce = (func, delay) => {
        let debounceTimer
        return function () {
            const context = this
            const args = arguments
            clearTimeout(debounceTimer)
            debounceTimer
                = setTimeout(() => func.apply(context, args), delay)
        }
    }
    function HtmlEncode(s) {
        var el = document.createElement("div");
        el.innerHTML = s;
        const sLocal = el.textContent || el.innerText || "";
        el.remove();
        return sLocal;
    }
    function setEventListners() {
        if (EventListnsers.indexOf("#candidate_link") == -1 && ("#candidate_link").length > 0) {
            $("#candidate_link").on("click", function (event) {
                $("#save_linked_in_profile_pdf").prop("checked", extSettings.autoPdf)
                toggleTabs(event, $(this).attr("data-entity"))
            });
            EventListnsers.push("#candidate_link");
        }
        if (EventListnsers.indexOf("#contact_link") == -1 && ("#contact_link").length > 0) {
            $("#contact_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"))
            });
            EventListnsers.push("#contact_link");
        }
        if (EventListnsers.indexOf("#company_link") == -1 && ("#company_link").length > 0) {

            $("#company_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"))
            });
            EventListnsers.push("#company_link");
        }
        if (EventListnsers.indexOf("#settings_link") == -1 && ("#settings_link").length > 0) {

            $("#settings_link").on("click", function (event) {

                // Apply settings on setting form
                // Click to parse
                var ctpChecked = true // By default keep click to parse on
                if (extSettings.ctp != undefined && extSettings.ctp === false) {
                    ctpChecked = false
                }
                $("#settings_ctp").prop("checked", ctpChecked)

                // Auto profile pdf upload
                var autoPdf = true // By default keep click to parse on
                if (extSettings.autoPdf != undefined && extSettings.autoPdf === false) {
                    autoPdf = false
                }
                $("#settings_auto_pdf").prop("checked", autoPdf)

                //Override Data
                var overrideData = true // By default keep click to override data on
                if (extSettings.overrideData != undefined && extSettings.overrideData === false) {
                    overrideData = false
                }
                $("#settings_override_data").prop("checked", overrideData)

                toggleTabs(event, $(this).attr("data-entity"))
                $('.setting-tooltip-span:not(.tooltipstered)').tooltipster({
                    theme: 'tooltipster-shadow',
                    animation: 'fade',
                    interactive: true,
                    trigger: 'hover',
                    // new function here 
                    functionReady: function () {
                        // $("#ctp_setting_tooltip iframe")[0].src = $("#ctp_setting_tooltip iframe").attr("data-src")
                    }
                });
            });
            EventListnsers.push("#settings_link");
        }
        if (EventListnsers.indexOf("#settings_ctp") == -1 && ("#settings_ctp").length > 0) {
            $("#settings_ctp").on("change", function (e) {
                var ctp = e.currentTarget.checked
                storeInLocalStorage("ctp", ctp)
                extSettings = getFromLocalStorage();
                if (!ctp) {
                    stopLinkedInObserver()
                } else {
                    startLinkedInObserver()
                }
            })
            EventListnsers.push("#settings_ctp");
        }
        if (EventListnsers.indexOf("#settings_auto_pdf") == -1 && ("#settings_auto_pdf").length > 0) {
            $("#settings_auto_pdf").on("change", function (e) {
                var autoPdf = e.currentTarget.checked
                storeInLocalStorage("autoPdf", autoPdf)
                extSettings = getFromLocalStorage();
            })
            EventListnsers.push("#settings_auto_pdf");
        }

        // Override Data
        if (EventListnsers.indexOf("#settings_override_data") == -1 && ("#settings_override_data").length > 0) {
            $("#settings_override_data").on("change", function (e) {
                var overrideData = e.currentTarget.checked
                storeInLocalStorage("overrideData", overrideData)
                extSettings = getFromLocalStorage();
            })
            EventListnsers.push("#settings_override_data");
        }

        if (EventListnsers.indexOf("#candidate_details_link") == -1 && ("#candidate_details_link").length > 0) {
            $("#candidate_details_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"), true)
            });
            EventListnsers.push("#candidate_details_link");
        }
        if (EventListnsers.indexOf("#contact_details_link") == -1 && ("#contact_details_link").length > 0) {
            $("#contact_details_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"), true)
            });
            EventListnsers.push("#contact_details_link");
        }
        if (EventListnsers.indexOf("#company_details_link") == -1 && ("#company_details_link").length > 0) {
            $("#company_details_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"), true)
            });
            EventListnsers.push("#company_details_link");
        }
        if (EventListnsers.indexOf("#candidate_notes_link") == -1 && ("#candidate_notes_link").length > 0) {
            $("#candidate_notes_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"), true)
            });
            EventListnsers.push("#candidate_notes_link");
        }
        if (EventListnsers.indexOf("#contact_notes_link") == -1 && ("#contact_notes_link").length > 0) {
            $("#contact_notes_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"), true)
            });
            EventListnsers.push("#contact_notes_link");
        }
        if (EventListnsers.indexOf("#company_notes_link") == -1 && ("#company_notes_link").length > 0) {
            $("#company_notes_link").on("click", function (event) {

                toggleTabs(event, $(this).attr("data-entity"), true)
            });
            EventListnsers.push("#company_notes_link");
        }
        if (EventListnsers.indexOf("#btn_login") == -1 && ("#btn_login").length > 0) {
            $("#btn_login").on("click", function () {
                newWindow = window.open($(this).attr("data-link"), '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');
                newWindow.addEventListener('message', function (message) {
                    if (message.data == "rcrm_loggedin") {
                        newWindow.close();
                        get_user();
                    }
                });
            });
            EventListnsers.push("#btn_login");
        }
        if (EventListnsers.indexOf(".candidate_resume_drag") == -1 && (".candidate_resume_drag").length > 0) {
            $(".candidate_resume_drag").on("dragover", function (event) {
                event.preventDefault();
            });
            EventListnsers.push(".candidate_resume_drag");
        }

        if (EventListnsers.indexOf(".candidate_resume_drop") == -1 && (".candidate_resume_drop").length > 0) {
            $(document).on("drop", ".candidate_resume_drop", function (event) {
                event.preventDefault();
                eventdataTransfer = event.originalEvent.dataTransfer;
                if (event.originalEvent.dataTransfer.items) {
                    for (var i = 0; i < event.originalEvent.dataTransfer.items.length; i++) {
                        if (event.originalEvent.dataTransfer.items[i].kind === 'file') {
                            var file = event.originalEvent.dataTransfer.items[i].getAsFile();
                            $('.candidate_resume_p').text(file.name);
                            $('#candidate_resume')[0].files = event.originalEvent.dataTransfer.files;
                            $('.candidate_resume_p').addClass('color-primary');
                        }
                    }
                } else {
                    for (var i = 0; i < event.originalEvent.dataTransfer.files.length; i++) {
                        $('.candidate_resume_p').text(file.name);
                        $('#candidate_resume')[0].files = event.originalEvent.dataTransfer.files;
                        $('.candidate_resume_p').addClass('color-primary');
                    }
                }
            });
            EventListnsers.push(".candidate_resume_drop");
        }
        if (EventListnsers.indexOf("#candidate_resume") == -1 && ("#candidate_resume").length > 0) {

            $(document).on("change", "#candidate_resume", function (event) {
                event.preventDefault();
                $('.candidate_resume_p').text($('#candidate_resume')[0].files[0].name);
                $('.candidate_resume_p').addClass('color-primary');
            });
            EventListnsers.push("#candidate_resume");
        }
        if (EventListnsers.indexOf(".drop_zone") == -1 && (".drop_zone").length > 0) {

            $(document).on("click", ".drop_zone", function (event) {
                event.preventDefault();
                event.stopPropagation();
                $('#candidate_resume').click();
            });
            EventListnsers.push(".drop_zone");
        }
        if (EventListnsers.indexOf(".submit-screen-ok") == -1 && (".submit-screen-ok").length > 0) {
            $('.submit-screen-ok').on("click", function (event) {
                resetProfileUI();
                showSection('in-ext');
                $(".tablinks.active").click();
            });
            EventListnsers.push(".submit-screen-ok");
        }
        if (EventListnsers.indexOf("#candidate_form") == -1 && ("#candidate_form").length > 0) {
            $('#candidate_form').on('submit', function (e) {
                e.preventDefault();
                e.stopPropagation();
                setIsProcessing('#candidate_form button[type=submit]');
                versionTag = $("#pdf_version_tag").val()
                if (versionTag && versionTag != "" && $("#save_linked_in_profile_pdf").is(":checked")) 
                {
                    var messageData = {};
                    if (currentUrlObj.toString().indexOf("linkedin.com/recruiter/profile") > -1) {
                        var linkedin = fromTopJQcontext('#topcard div.module-footer ul li.public-profile.searchable a').attr('href');
                        var linkedInslug = linkedin.split('/')[4];
                    } else if (currentUrlObj.toString().indexOf("linkedin.com/talent/profile") > -1) {
                        var linkedin = fromTopJQcontext('[data-test-personal-info-profile-link]')[0].href;
                        var linkedInslug = linkedin.split('/')[4];
                    } else if (currentUrlObj.toString().indexOf("linkedin.com/talent/hire") > -1 || currentUrlObj.toString().indexOf("linkedin.com/talent/search") > -1) {
                        var linkedin = fromTopJQcontext('[data-test-public-profile-link]').attr('href');
                        var linkedInslug = linkedin.split('/')[4];
                    } else if (currentUrlObj.toString().indexOf("linkedin.com/sales/people") > -1) {
                        var linkedInslug = copiedLinkedinUrl.split('/')[4];

                        messageData.message = "getLinkedInPersonProfilePdf";
                        messageData.type = "5";
                        messageData.slug = linkedInslug;
                        messageData.versionTag = versionTag;
                        sendMessageToParent(messageData);

                        return;
                    } else {
                        var linkedInslug = $(currentUrlObj).attr('pathname');
                        linkedInslug = linkedInslug.split("/")[2];
                    }

                    messageData.message = "getLinkedInPersonProfilePdf";
                    messageData.type = "5";
                    messageData.slug = linkedInslug;
                    messageData.versionTag = versionTag;
                    sendMessageToParent(messageData);
                } else {
                    createCandidateRecord(true);
                }
            });
            EventListnsers.push("#candidate_form");
        }

        if (EventListnsers.indexOf("#contact_form") == -1 && ("#contact_form").length > 0) {
            $('#contact_form').on('submit', function (e) {
                e.preventDefault();
                e.stopPropagation();
                setIsProcessing('#contact_form button[type=submit]');
                createContactRecord();
            });
            EventListnsers.push("#contact_form");
        }
        if (EventListnsers.indexOf("#company_form") == -1 && ("#company_form").length > 0) {
            $('#company_form').on('submit', function (e) {
                e.preventDefault();
                e.stopPropagation();
                setIsProcessing('#company_form button[type=submit]');
                company = {};
                contact = {};
                var formData = $("#company_form").serializeArray();
                var addToObject = true;
                var companynote = "";
                Object.keys(formData).forEach(key => {
                    addToObject = true
                    var _key = formData[key].name.substr(formData[key].name.indexOf("company_") + 8);
                    if (formData[key].name == "extra_data_comp_notes") {
                        addToObject = false;
                        companynote = formData[key].value.trim();
                        delete formData[key];
                    }
                    if (addToObject) {
                        if (_key.indexOf('contact_') !== -1) {
                            contact[_key.substr(formData[key].name.indexOf("contact_"))] = formData[key].value;
                        } else {
                            company[_key] = formData[key].value;
                        }
                    }
                });
                var logo = $('#company_logo').attr('src');
                if (logo != undefined && logo !== '' && logo.indexOf('chrome-extension:') == -1) {
                    company.logo = logo;
                }
                var photo = $('#company_contact_photo').attr('src');
                if (photo != undefined && photo !== '' && photo.indexOf('chrome-extension:') == -1) {
                    contact.photo = photo;
                }
                contact.locality = $('#contact_locality').val();
                var message = { "message": "companyContactSubmit", "payload": { "company": company, "contact": contact, 'extension_request': true, 'overrideData': extSettings.overrideData } };
                if (companynote != '') {
                    message.payload.companynote = companynote;
                }
                sendMessageToParent(message);
            });
            EventListnsers.push("#company_form");
        }

        // Salesforce user settings button submit
        if (EventListnsers.indexOf("#settings_form") == -1 && ("#settings_form").length > 0) {
            $('#settings_form').on('submit', function (e) {
                e.preventDefault();
                e.stopPropagation();
                setIsProcessing('#settings_form button[type=submit]');
                sfusersettings = {};
                var formData = $("#settings_form").serializeArray();
                sfusersettings.sfusername = $('#sfUsername').val();
                sfusersettings.sfuserpassword = $('#sfPassword').val();
                sfusersettings.clientid = $('#sfClientid').val();
                sfusersettings.clientsecret = $('#sfClientsecret').val();
                var message = { "message": "SFSettingsSubmit", "payload": { "sfusersettings": sfusersettings } };
                sendMessageToParent(message);
            });

            EventListnsers.push("#settings_form");
        }

        if (EventListnsers.indexOf("#appointment_form") == -1 && ("#appointment_form").length > 0) {
            $('#appointment_form').on('submit', function (e) {
                e.preventDefault();
                e.stopPropagation();
                setIsProcessing('#appointment_form button[type=submit]');
                appointment = {};
                var formData = $("#appointment_form").serializeArray();
                var addTodAppointment = true;
                extraData = {};

                Object.keys(formData).forEach(key => {

                    var _key = formData[key].name.substr(formData[key].name.indexOf("appointment_") + 12);
                    if (_key == 'starttime' || _key == 'endtime') {
                        extraData[_key] = formData[key].value;
                        addTodAppointment = false;
                    }
                    if (addTodAppointment) {
                        appointment[_key] = formData[key].value;
                    }
                });

                appointment.reminderdate = $('#appointment_reminderdate').val();
                appointment.startdate = parseInt(new Date(appointment.startdate).getTime() / 1000)
                appointment.enddate = appointment.startdate + parseInt(extraData.endtime);
                appointment.startdate += parseInt(extraData.starttime);
                extraData.collaborators = $('#appointment_attendees').val();
                appointment.relatedto = $('#appointment_relatedto').val();
                appointment.accountid = user.accountid;
                appointment.allday = 1;
                appointment.creatorname = user.name;
                appointment.emailbatchid = null;
                appointment.eventid = "";
                appointment.ownerid = null;
                appointment.type = 2;
                appointment.status = 0;
                appointment.description = $('#appointment_description').val();
                sendMessageToParent({ "message": "appointmentSubmit", "payload": { "appointment": appointment, "extraData": extraData } });
            });
            EventListnsers.push("#appointment_form");
        }
        if (EventListnsers.indexOf("#task_form") == -1 && ("#task_form").length > 0) {
            $('#task_form').on('submit', function (e) {
                e.preventDefault();
                e.stopPropagation();
                setIsProcessing('#task_form button[type=submit]');
                task = {};
                var formData = $("#task_form").serializeArray();
                var addTodTask = true;
                extraData = {};

                Object.keys(formData).forEach(key => {

                    var _key = formData[key].name.substr(formData[key].name.indexOf("task_") + 5);
                    if (_key == 'starttime' || _key == 'endtime') {
                        extraData[_key] = formData[key].value;
                        addTodTask = false;
                    }
                    if (addTodTask) {
                        task[_key] = formData[key].value;
                    }
                });
                task.accountid = user.accountid;
                task.address = "";
                task.allday = 0;
                task.creatorname = user.name;
                task.emailbatchid = null;
                task.enddate = undefined;
                task.eventid = 1;
                task.ownerid = null;
                // task.ownerid = $('#task_ownerid').val();
                extraData.collaborators = $('#task_collaborators').val();
                task.relatedto = $('#task_relatedto').val();
                task.reminderdate = $('#task_reminderdate').val();
                task.startdate = parseInt(new Date(task.startdate).getTime() / 1000)
                task.startdate += parseInt(extraData.starttime);
                task.status = "";
                task.description = $('#task_description').val();
                task.type = 1;

                sendMessageToParent({ "message": "taskSubmit", "payload": { "task": task, "extraData": extraData } });
            });
            EventListnsers.push("#task_form");
        }

        if (EventListnsers.indexOf("#contact_companyid") == -1 && ("#contact_companyid").length > 0) {
            $("#contact_companyid").on("keyup", debounce(function (e) {
                if (e.key !== undefined) {
                    var q = $("#contact_companyid").val();
                    if (_comapnyid != q) {
                        _comapnyid = q;
                        sendMessageToParent({ 'message': 'getCompanies', 'q': q });
                        $(".search-company-loader").removeClass("d-none").addClass("d-block");
                    }
                }
            }, 500));
            EventListnsers.push("#contact_companyid");
        }
        if (EventListnsers.indexOf("#noti_Button") == -1 && ("#noti_Button").length > 0) {
            $('#noti_Button').on('click', function () {
                $('.notification-count-span').toggleClass('d-none', true).toggleClass('d-block', false);
                localStorage.new_notification_count = 0;
                $('.notification-count-span').text('');
                // TOGGLE (SHOW OR HIDE) NOTIFICATION WINDOW.
                $('#notifications').fadeToggle('fast', 'linear', function () {
                });
                $('#noti_Counter').fadeOut('slow'); // HIDE THE COUNTER.
                return false;
            });
            // HIDE NOTIFICATIONS WHEN CLICKED ANYWHERE ON THE PAGE.
            $(document).click(function (e) {
                if (!e.target.id == 'notifications' && !$(e.target).closest('#notifications').length) {
                    $('#notifications').hide();
                    // CHECK IF NOTIFICATION COUNTER IS HIDDEN.
                    if ($('#noti_Counter').is(':hidden')) {
                        // CHANGE BACKGROUND COLOR OF THE BUTTON.
                        $('#noti_Button').css('background-color', '#2E467C');
                    }
                }
            });

            EventListnsers.push("#noti_Button");
        }

        if (EventListnsers.indexOf(".entity-action-btns") == -1 && (".entity-action-btns").length > 0) {
            $('.entity-action-btns').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var link = document.createElement('a');
                var _href = $(this).attr('data-href');
                if (_href) {
                    var presetEntity = {};
                    link.href = $(this).attr('data-href');
                    var entity = $(this).attr('data-entity');
                    presetEntity[entity] = window[entity];
                    fnsetUpFollowupControls($(this).attr('data-href'), presetEntity);
                } else {
                    link.href = $(this).attr('href');
                }

                link.rel = $(this).attr('data-rel');
                document.body.appendChild(link);
                link.click();
            });

            EventListnsers.push(".entity-action-btns");
        }
        if (EventListnsers.indexOf(".assign_to_job_followup_link") == -1 && (".assign_to_job_followup_link").length > 0) {
            $('.assign_to_job_followup_link').on('click', function (e) {
                var entity = 'candidate';
                var profileLink = BASE_APP_URL + '/' + entity + '/' + window[entity].slug;
                $('#assign_to_job_followup .details-link').attr('href', profileLink);
                var name = window[entity]['name'] ? window[entity]['name'] : window[entity]['candidatename'];
                $('#assign_to_job_followup .success-name').text(name.trim());
                assignedJobs = []
                sendMessageToParent({ 'message': 'getAssignedJobs', 'data': { 'id': candidate.id } });
                if (hiringStages.length < 1) {
                    sendMessageToParent({ 'message': 'getHiringStages', 'data': {} });
                    sendMessageToParent({ 'message': 'getHiringStagesEmailTrigger', 'data': {} });
                }
            });

            EventListnsers.push(".assign_to_job_followup_link");
        }
        if (EventListnsers.indexOf(".notes_list_link") == -1 && (".notes_list_link").length > 0) {
            $('.notes_list_link').on('click', function (e) {
                var entity = $(this).attr('data-entity');
                var notes = window[entity + "Notes"]
                notesHtml = ""
                $(".note-li").remove()
                if (notes.length) {
                    notes.forEach(note => {
                        notesHtml = $($(".note-li-shadow")[0]).html()
                        var li = document.createElement('li');
                        li.innerHTML = notesHtml
                        $(li).removeClass("note-li-shadow").removeClass("d-none").addClass("note-li")
                        $("#notes-list").append(li);
                        $(".note-contents", $(li)).text(note.description)
                        $(".note-created-by", $(li)).text(note.creatorname)
                        var date = new Date(note.createdon * 1000);
                        $(".note-created-on", $(li)).text(date.toLocaleString())

                    });
                } else {
                    var li = document.createElement('li');
                    li.innerHTML = "<br><h3 style='text-align: center'>YouÃ¢â‚¬â„¢ll See Notes You Add Here :)</h3>";
                    $(li).removeClass("note-li-shadow").removeClass("d-none").addClass("note-li");
                    $("#notes-list").append(li);
                    $('#note_empty_state_img').show();
                }
            });

            EventListnsers.push(".notes_list_link");
        }
        if (EventListnsers.indexOf(".add_to_hot_list_followup_link") == -1 && (".add_to_hot_list_followup_link").length > 0) {
            $('.add_to_hot_list_followup_link').on('click', function (e) {
                var entity = $(this).attr('data-entity');
                $('#add_to_hot_list_followup').attr('data-entity', entity);
                var profileLink = BASE_APP_URL + '/' + entity + '/' + window[entity].slug
                $('#add_to_hot_list_followup .details-link').attr('href', profileLink);
                var name = window[entity]['name'] ? window[entity]['name'] : window[entity][entity + 'name'];
                $('#add_to_hot_list_followup .success-name').text(name.trim());

                $('#add_to_hot_list_followup #add_to_hot_list_followup_or_div').css('display', 'flex');
                $('#add_to_hot_list_followup #add_to_hot_list_followup_new_hotlist_div').css('display', 'block');

                setHotListSelectOptions(entity);
                sendMessageToParent({ 'message': 'getHotlistsBeforeGetAssignedHotlists', "data": { "entity_name": entity == 'company' ? 'companies' : entity + 's' }, "entity": entity });
            });
            EventListnsers.push(".add_to_hot_list_followup_link");
        }
        if (EventListnsers.indexOf(".hide-notification") == -1 && (".hide-notification").length > 0) {
            $('.hide-notification').on('click', function (e) {
                sendMessageToParent({ 'message': 'setExtenstion' });
            });
            EventListnsers.push(".hide-notification");
        }
    }
    function checkEverytingLoaded() {
        if ($ !== undefined) {
            if (userCallFinished) {
                setTimeout(() => {
                    document.getElementById('main').style.visibility = 'visible';
                    document.getElementById('notification-placeholder').style.visibility = 'visible';
                    document.getElementById('out-ext').style.visibility = 'visible';
                }, 100);


                clearInterval(checkEverytingLoadedInterval);
                setEventListners();
                setUserLoadedState();
            }
            setTimeout(() => {
                initControls();
            }, 1000);
        }
    }
    function loadFolloUpActionsData(entity) {
        if (jobs == undefined || jobs.length < 1) {
            sendMessageToParent({ 'message': 'getJobsToAssignCandidate' });
        }
        if (hotlists.entity == undefined || hotlists.entity.length < 1) {
            sendMessageToParent({ 'message': 'getHotlists', "data": { "entity_name": entity == 'company' ? 'companies' : entity + 's' }, "entity": entity });
        } else {
            setHotListSelectOptions(entity);
        }
    }
    function setIsProcessing(Identifier) {
        $(Identifier).addClass("button is-loading");
    }
    function stopProcessing(Identifier) {
        $(Identifier).removeClass("button is-loading");
    }
    // ---
    // To be called when user is reloaded (eg: after loggin in)
    function setFrameLoadingState() {
        $(".main").toggleClass('d-none', true).toggleClass('d-block', false);
        $(".is-loading").toggleClass('d-block', true).toggleClass('d-none', false);
    }
    function setFrameLoadedState() {
        $(".is-loading").toggleClass('d-none', true).toggleClass('d-block', false);
        $(".main").toggleClass('d-block', true).toggleClass('d-none', false);
        if (user.id === undefined) {
            // show loin page
            showSection('out-ext');
            return;
        }
    }
    function setUserLoadedState() {
        $(".is-loading").toggleClass('d-none', true).toggleClass('d-block', false);
        $(".main").toggleClass('d-block', true).toggleClass('d-none', false);
        if (user.id === undefined) {
            // show loin page
            showSection('out-ext');
            return;
        }
        showSection('in-ext');
        setEventListners();
        startMonitors();
        fullResumeText = undefined;
        $(".tablinks.active").click();
    }
    function showSection(sectionClass, callBack = function () { }) {
        $(".ext-section").toggleClass('d-none', true).toggleClass('d-block', false);//hide all ext sections
        $("." + sectionClass).toggleClass('d-block', true).toggleClass('d-none', false);//show the ext section
        setTimeout(() => {
            callBack();
        }, 0);
    }
    async function get_user() {
        sendMessageToParent({
            "message": "getUser",
        });

        setFrameLoadingState();
    }
    var checkEverytingLoadedInterval = setInterval(checkEverytingLoaded, 100);
    function sendMessageToParent(message) {
        window.top.postMessage(message, '*');
    }
    function submitSuccessHandler(message, entity) {
        response = JSON.parse(message.data.response);
        var extraMessage = "";
        switch (entity) {
            case "candidateerror":
                error = response.data.candidateerror;
                $('.assign-to-job-foolowup-link').removeClass("d-none").addClass("d-block");
                $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "candidate");
                $('.candidate-error-container .candidate-error').text(error + "!");
                $('.candidate-error-container').show();
                $('.candidate-error-container').fadeTo(2000, 500).slideUp(500, function(){
                    $('.candidate-error-container').hide();
                });

                stopProcessing('#candidate_form button[type=submit]');
                break;
            case "settings":
                settings = response.data.settings;
                $('.assign-to-job-foolowup-link').removeClass("d-none").addClass("d-block");
                $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "candidate");

                $('.settings-success').show();
                $('.settings-success').fadeTo(2000, 500).slideUp(500, function(){
                    $('.settings-success').hide();
                });

                stopProcessing('#' + entity + '_form button[type=submit]');
                break;
            case "candidate":
                candidate = response.data.candidate;
                $('.assign-to-job-foolowup-link').removeClass("d-none").addClass("d-block");
                $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "candidate");
                
                $('.candidate-success').show();
                $('.candidate-success').fadeTo(2000, 500).slideUp(500, function(){
                    $('.candidate-success').hide();
                });

                stopProcessing('#' + entity + '_form button[type=submit]');
                break;
            case "company":
                $('.assign-to-job-foolowup-link').removeClass("d-block").addClass("d-none");
                if (response.action_name.indexOf('Update Duplicate Contact') != -1) {
                    if (response.action_name == 'Update Duplicate Contact And No Company Created') {
                        stopProcessing('#' + entity + '_form button[type=submit]');
                        entity = 'contact';
                        contact = response.data.contact;
                        response.data.duplicate_updated = true;
                        extraMessage = response.message;
                        $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "contact");
                    } else {
                        company = response.data.company;
                        $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "company");
                    }
                } else if (response.action_name == 'Duplicate Company Updated') {
                    stopProcessing('#' + entity + '_form button[type=submit]');
                    entity = 'company';
                    company = response.data.company;
                    response.data.duplicate_updated = true;
                    extraMessage = response.message;
                    $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "company");
                } else if (response.action_name == 'Updated Company And Contact') {
                    stopProcessing('#' + entity + '_form button[type=submit]');
                    entity = 'company';
                    company = response.data.company;
                    response.data.duplicate_updated = true;
                    extraMessage = response.message;
                    $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "company");
                } else {
                    company = response.data.company;
                    $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "company");
                }
                break;
            case "contact":
                contact = response.data.contact;
                $('.assign-to-job-foolowup-link').removeClass("d-block").addClass("d-none");
                $('.rcrm-action-box .add_to_hot_list_followup_link').attr("data-entity", "contact");

                break;
            default:
                break;
        }
        if (response.status == "success") {
            submitedEntity = entity;
            $('.rcrm-message-partial').each(function (index, element) { $(element).toggleClass('d-none', true).toggleClass('d-block', false) });
            showSection('submit-ext', function () {
                $('#rcrm-success-' + entity + '-message').toggleClass('d-block', true).toggleClass('d-none', false);
                // Initialization of follow up section tools
                fnsetUpFollowupControls();
            });
            var profileLink = BASE_APP_URL + '/' + entity + '/' + response.data[entity].slug
            $('.details-link').attr('href', profileLink);
            var name = entity == 'contact' ? response.data[entity].name : response.data[entity][entity + 'name'];
            $('.success-name').text(name.trim());
            $('#rcrm-success-' + entity + '-added-updated').text('Has Been Added To ');
            console.log(response.data.duplicate_updated);
            if (response.data.duplicate_updated !== undefined && response.data.duplicate_updated == true) {
                $('#rcrm-success-' + entity + '-message .details-link .success-name').text(name);
                $('#rcrm-success-' + entity + '-added-updated').html("'s Profile Was <b>Updated</b> On ");
            }
            $('.extramessage').remove();
            if (extraMessage) {
                $('#rcrm-success-' + entity + '-message .rcrm-success-body').html($('#rcrm-success-' + entity + '-message .rcrm-success-body').html() + '<div class="rcrm-info-message m-t-5 m-b-0 extramessage" role="alert">' + extraMessage + '</div>');
            }
        }
        loadFolloUpActionsData(entity);
        stopProcessing('#' + entity + '_form button[type=submit]');
    }
    function setHotListSelectOptions(entity) {
        var options = '';
        if (hotlists[entity] != undefined) {
            hotlists[entity].forEach(function (hotlist) {
                options += '<option value =""></option><option value = ' + hotlist.id + '>' + hotlist.name + '</option>';
            });
        }
        $('#add_to_hot_list_select').empty().append(options);
        $('#add_to_hot_list_select').trigger("change");
        if (EventListnsers.indexOf("#btn_add_to_hot_list") == -1 && ("#btn_add_to_hot_list").length > 0) {
            $("#btn_add_to_hot_list").on("click", function () {
                // Either selscted hotlist or new hostlist
                if ($('#add_new_hotlist').val() || ($('#add_to_hot_list_select').val() && $('#add_to_hot_list_select').val().length)) {
                    addToHotList($('#add_to_hot_list_followup').attr('data-entity'));
                }
                else {
                    toastr.info("At Least one Hotlist Must Be Selected")
                }
            });
            EventListnsers.push("#btn_add_to_hot_list");
        }
    }
    function assignToJob() {
        setIsProcessing('#btn_assign_to_job');
        var selectedJobs = $(jobSelectId).val();
        if (selectedJobs.length) {
            jobs.forEach(job => {
                job.checked = false;
                if (selectedJobs.indexOf(job.id) != -1) {
                    job.checked = true;
                }
            });

            let jobsForResponse = jobs.filter((job) => {
                if (selectedJobs.indexOf(job.id) != -1) {
                    return true;
                }

                return false;
            });

            sendMessageToParent({ "message": "assignCandidateToJob", "payload": { "jobs": jobsForResponse, "candidates": [candidate.id] } });
        }
    }
    function sendEmailTrigger(eventMessage, trigger, triggervalue, entity, relatedtype, jobs = null, originalResponse, failedRecords = null, action = 'bulk', bypasNylas=false) {
        sendMessageToParent({
            "message": eventMessage,
            "originalResponse": originalResponse,
            "payload": {
                trigger: trigger,
                triggervalue: triggervalue,
                entity: entity,
                relatedtype: relatedtype,
                action: action,
                jobs: jobs,
                failedrecords: failedRecords,
                bypassNylas: true
            }
        });
    }
    function setEmailTriggerInputWhileChangeInHiringStage(stageId) {
        if (hiringStageTriggers.length > 0) {
            const trigger = hiringStageTriggers.find((trigger) => {
                return trigger.value == stageId;
            });

            if (trigger) {
                $('#update_hiring_stage_tooltip #trigger_hiring_update_email_div').show();
                $('#update_hiring_stage_tooltip #trigger_hiring_update_email').show();
                $('#update_hiring_stage_tooltip #trigger_hiring_update_email').prop('checked', true);
                $('#update_hiring_stage_tooltip #trigger_hiring_update_email_label').html('Send ' + trigger.name + ' Email');
            } else {
                $('#update_hiring_stage_tooltip #trigger_hiring_update_email_div').hide();
                $('#update_hiring_stage_tooltip #trigger_hiring_update_email').hide();
            }
        } else {
            $('#update_hiring_stage_tooltip #trigger_hiring_update_email_div').hide();
            $('#update_hiring_stage_tooltip #trigger_hiring_update_email').hide();
        }
    }
    function addToHotList(entity) {
        setIsProcessing('#btn_add_to_hot_list');
        var selectedHotlist = $("#add_to_hot_list_select").val();
        var payload = {};
        payload.selectedrows = [];
        if (selectedHotlist && selectedHotlist != "") {
            hotlists[entity].forEach(hotlist => {
                if (selectedHotlist == hotlist.id) {
                    payload["entity_name"] = entity == 'company' ? 'companies' : entity + 's';
                    payload.selectedrows.push(window[entity].id);
                    payload.shared = hotlist.shared == "1" ? true : false;
                    payload.name = hotlist.name;
                }
            });
        } else {
            var newHOtlist = $("#add_new_hotlist").val()
            if (newHOtlist && newHOtlist != "") {
                payload["entity_name"] = entity == 'company' ? 'companies' : entity + 's';
                payload.selectedrows.push(window[entity].id);
                payload.shared = $("#add_new_hotlist_shared")[0].checked ? true : false;
                payload.name = newHOtlist;
            }
        }
        sendMessageToParent({ "message": "addToHotList", "payload": payload });
    }
    function reset_appointment_form() {
        appointment = {};
        $('#appointment_title').val('');
        $('#appointment_address').val('');
        $('#appointment_description').trigger('reset');
        $('#appointment_starttime').val('50400');
        $('#appointment_endtime').val('52200');
        $('#appointment_reminderdate').val('1800');
        fnsetUpFollowupControls('#add_appointment_followup');
    }
    function reset_task_form() {
        appointment = {};
        $('#task_title').val('');
        $('#task_description').trigger('reset');
        $('#task_starttime').val('50400');
        $('#task_reminderdate').val('1800');
        fnsetUpFollowupControls('#add_task_followup');
    }
    function fnsetUpFollowupControls(section = "", presetEntity = {}, reinit = false) {
        var today = new Date();
        today = today.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        var _section = section ? section + ' ' : '';
        $(_section + '.rcrm-datepicker').each(function () {
            $(this).datepicker({
                minDate: new Date(),
                autoClose: true,
                dateFormat: 'M dd, yy',
            })
            $(this).data('datepicker')
            $(this).val(today);
        })
        if (Object.keys(presetEntity).length < 1) {
            presetEntity[submitedEntity] = window[submitedEntity];
        }
        sendMessageToParent({ "message": 'setUpFollowupControls', "presetEntity": presetEntity, "user": user, "section": section, 'reinit': reinit });
    }

    function get_entity_link(entity_type) {
        switch (entity_type) {
            case '1': //Account
                return 'account-management';
                break;
            case '2': //Contact
                return 'contact';
                break;
            case '3': // Company
                return 'company';
                break;
            case '4': // Job
                return 'job';
                break;
            case '5': // Candidate
                return 'candidate';
                break;
            case '6': // User
                return 'user-list';
                break;
            case '7': // Appointment
                return 'task-and-appointments';
                break;
            case '8': // CallLog
                return 'mailbox/calllog';
                break;
            case '9': // Email
                return 'mailbox/inbox';
                break;
            case '10': // Email
                return 'mailbox/sent';
                break;
            default:
                return '';
                break;
        }
    }
    var groupBy = function (arr, criteria) {
        return arr.reduce(function (obj, item) {

            // Check if the criteria is a function to run on the item or a property of it
            var key = typeof criteria === 'function' ? criteria(item) : item[criteria];

            // If the key doesn't exist yet, create it
            if (!obj.hasOwnProperty(key)) {
                obj[key] = [];
            }

            // Push the value to the object
            obj[key].push(item);

            // Return the object to the next item in the loop
            return obj;

        }, {});
    };
    function populateNotifications(_notifications) {
        if (localStorage.last_notification_id == undefined) {
            localStorage.last_notification_id = 0;
        }
        $('.notification-count-span').toggleClass('d-none', true).toggleClass('d-block', false);
        _notifications.forEach(notification => {
            if (!notification_ids.includes(notification.id)) {
                notifications.unshift(notification);
                notification_ids.push(notification.id);
                notification.id = parseInt(notification.id);
                if (notification.id > localStorage.last_notification_id) {
                    localStorage.new_notification_count = parseInt(localStorage.new_notification_count) + 1;
                    localStorage.last_notification_id = notification.id;
                }
                localStorage.last_notification_id_2 = notification.id
                //document.cookie = "last_notification_id=" + notification.id + ';path=/';
            }
        });
        if (localStorage.new_notification_count > 0) {
            $('.notification-count-span').text(localStorage.new_notification_count);
            $('.notification-count-span').toggleClass('d-none', false).toggleClass('d-block', true);
        }
    }
    function setNotificationUi() {
        if (notifications.length < 1) {
            return;
        }
        var notificationUi = '';
        clubbedNotifications = groupBy(notifications, 'notificationtitle');
        Object.values(clubbedNotifications).forEach(function (notification) {
            notificationObj = notification[notification.length - 1];
            if (notification.length == 1) {
                var n_icon = notificationObj.notificationicon ? notificationObj.notificationicon : '';
                var n_title =
                    `<a id="sTest-emailSettingsInAppBtn"
                    class="dropdown-item" target="_blank" href="`+ BASE_APP_URL + `/` + get_entity_link(notificationObj.relatedtotype) + `/` + notificationObj.relatedto + `">
                    <h5>`+ notificationObj.notificationtitle + `</h5>
                 </a>`;
            } else {
                var n_title =
                    `<h5>` + notificationObj.notificationtitle + `</h5>`;
            }
            if (notification.length > 1) {
                var groupedNotifications = notification.reverse();
                var groupedNotificationUi = ``;
                var n_icon = '';
                groupedNotifications.forEach(groupedNotification => {
                    n_icon = groupedNotification.notificationicon ? groupedNotification.notificationicon : '';
                    groupedNotificationUi +=
                        `<li>
                        <a  target="_blank" href="`+ BASE_APP_URL + `/` + get_entity_link(groupedNotification.relatedtotype) + `/` + groupedNotification.relatedto + `" class="tooltip"  title="` + groupedNotification.notification + `">
                            <div id="sTest-emailSettingsInAppBtn" class="notification-avatar-list">
                            `+ groupedNotification.notificationicon + `
                            </div>
                        </a>
                    </li>`;
                });
                var n_message =
                    `<ul class="noti-avatar-list">` + groupedNotificationUi + `</ul>`;
            } else {
                var n_message = `<p>` + notificationObj.notification + `</p>`;
            }
            notificationUi +=
                `<li class="notification-list-item">
                <div class="media">
                    <div class="media-left mr-10">` + n_icon + `
                    </div>
                    <div class="media-content">`
                + n_title +
                ``
                + n_message +
                `</div>
                </div>
            </li>`;
        });
        $('#notificationsList').html(notificationUi);
        $('.tooltip').tooltipster({
            theme: 'tooltipster-shadow',
            animation: 'fade',
            interactive: true,
            delay: 1500
        });
    }
    function finishParsing(reset) {
        var profileParsed = false;
        if ((profile.email != undefined && profile.email.value) ||
            (profile.phone != undefined && profile.phone.value) ||
            (profile.linkedin != undefined && profile.linkedin.value) ||
            (profile.clinkedin != undefined && profile.clinkedin.value) ||
            (profile.website != undefined && profile.website.value)) {
            profileParsed = true;
        }

        if (profile.website != undefined && profile.website.value) {
            company['website'] = profile.website.value;
        }
        if (profile.clinkedin != undefined && profile.clinkedin.value) {
            company['profilelinkedin'] = profile.clinkedin.value;
        }
        if (profile.cname != undefined && profile.cname.value) {
            company['companyname'] = profile.cname.value;
        }

        updateProfileUI(reset);
        if (profileParsed) {
            checkDuplicate();
        }
        setFrameLoadedState();
    }
    
    function checkDuplicate() {
        createCandidateRecord(false);
        createContactRecord(false);
        $('.exists-message-container').toggleClass('slidedown', true).toggleClass('d-block', true).toggleClass('d-none', false);
        $('.exists-message-container').children('div').toggleClass('d-block', false).toggleClass('d-none', true);
        $('.exists-message-container .exists-loading').toggleClass('d-block', true).toggleClass('d-none', false);
        $('.form-container').toggleClass('slidedown', true);
        var name = candidate.firstname + ' ' + candidate.lastname;
        var cname = company.companyname;
        $('.exists-message-container .exists-name').text(name != undefined && name != '' ? name : '');
        $('.exists-message-container .exists-cname').text(cname != undefined && cname != '' ? cname : '');
        sendMessageToParent({
            "message": "checkDuplicate",
            "payload": {
                "candidate": candidate,
                "contact": contact,
                "company": company
            }
        });
    }

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.replace(/^.*,/, ''));
        reader.onerror = error => reject(error);
    });

    async function createCandidateRecord(submit = true) 
    {
        candidate = {};
        var formData = $("#candidate_form").serializeArray();
        var extraData = {};
        var addTodCandidate = true;
        if ($('#candidate_resume')[0].files.length) {
            candidate.resume = $('#candidate_resume')[0].files[0];
            candidate.base64 = await toBase64(candidate.resume);
        }

        Object.keys(formData).forEach(key => {
            addTodCandidate = true
            if (formData[key].name == "pdf_version_tag") {
                return
            }
            var _key = formData[key].name.substr(formData[key].name.indexOf("candidate_") + 10);
            if (formData[key].name.indexOf("extra_data_cand_") > -1) {
                addTodCandidate = false;
                switch (formData[key].name) {
                    case 'extra_data_cand_notes':
                        extraData.note = formData[key].value.trim();
                        break;
                    case 'extra_data_cand_base64_profile':
                        extraData.base64Profile = formData[key].value.trim();
                        break;
                    default:
                        break;
                }

                delete formData[key];
            }
            if (addTodCandidate) {
                switch (_key) {
                    case 'skill':
                        if ($('#candidate_skill').val().length) {
                            candidate[_key] = JSON.parse($('#candidate_skill').val()).map(c => c.value).join(',')
                        }
                        break;

                    default:
                        candidate[_key] = formData[key].value;
                        break;
                }
            }
        });
        var profilepic = $('#candidate_profilepic').attr('src');
        if (profilepic != undefined && profilepic !== '' && profilepic.indexOf('chrome-extension:') == -1) {
            candidate.profilepic = profilepic;
        }
        // candidate.availablefrom = Math.floor(Date.now() / 1000);
        candidate.currencyid = user.currencyid;
        candidate.sourceadded = '{"source": "Chrome Extensions", "referrer": ' + currentUrlObj.href + '}';
        if (!candidate.id) {
            if (Domains[document.domain] && Domains[document.domain].name) {
                candidate.source = `${Domains[document.domain].name} (Added by ${user.name})`;
            }
        }
        fullResumeText = '';
        if (fullResumeText) {
            candidate.resumetext = fullResumeText;
        }
        if (base64Text) {
            extraData.base64Profile = base64Text;
        }
        if (submit) {
            sendMessageToParent({ "message": "candidateSubmit", "payload": { "candidate": candidate, "extraData": extraData, "overrideData": extSettings.overrideData } });
        }
    }
    function createContactRecord(submit = true) {
        contact = {};
        var formData = $("#contact_form").serializeArray();
        var extraData = {};
        var addTodContact = true;
        Object.keys(formData).forEach(key => {
            addTodContact = true
            var _key = formData[key].name.substr(formData[key].name.indexOf("contact_") + 8);
            if (_key == "name") {
                addTodContact = false;
                var nameParts = formData[key].value.trim().split(' ');
                if (nameParts.length > 1) {
                    contact['lastname'] = nameParts[nameParts.length - 1];
                    nameParts[nameParts.length - 1] = "*" + nameParts[nameParts.length - 1] + "*";
                    contact['firstname'] = nameParts.join(' ').replace(nameParts[nameParts.length - 1], '').trim();
                } else {
                    contact['firstname'] = nameParts[0];
                    contact['lastname'] = "";
                }
            }
            if (formData[key].name == "extra_data_cont_notes") {
                addTodContact = false;
                extraData = { "note": formData[key].value.trim() };
                delete formData[key];
            }
            if (_key == "companyid") {
                addTodContact = false;
                var companyid = '';
                if (formData[key].value !== undefined && formData[key].value !== '') {
                    if ($("#companies_list option[value='" + $.escapeSelector(formData[key].value) + "']").length) {
                        companyid = $("#companies_list option[value='" + $.escapeSelector(formData[key].value) + "']")[0].dataset.id;
                    }
                    contact[_key] = companyid !== "" && companyid !== "" ? companyid : '';
                }
            }
            if (_key == "add_company") {
                addTodContact = false;
            }
            if (addTodContact) {
                contact[_key] = formData[key].value;
            }
        });
        var photo = $('#contact_photo').attr('src');
        if (photo != undefined && photo !== '' && photo.indexOf('chrome-extension:') == -1) {
            contact.photo = photo;
        }
        if (submit) {
            var payload = { "contact": contact, "extraData": extraData, "overrideData": extSettings.overrideData };
            sendMessageToParent({ "message": "contactSubmit", "payload": payload });
        }
    }
    function setSplitName(name) {
        if (!name || !name.length) {
            return
        }
        var nameParts = name.trim().split(' ');
        if (nameParts.length > 1) {
            //var fname = nameParts.join(' ').replace(nameParts[nameParts.length - 1], '').trim();
            var fname = nameParts[0].trim();
            profile.fname = {
                "value": fname,
                "type": "input"
            };
            //var lname = nameParts[nameParts.length - 1].trim();
            var lname = nameParts.join(' ').replace(nameParts[0], '').trim();
            profile.lname = {
                "value": lname,
                "type": "input"
            };
        } else {
            var fname = nameParts[0];
            profile.fname = {
                "value": fname,
                "type": "input"
            };
            var lname = "";
            profile.lname = {
                "value": lname,
                "type": "input"
            };
        }
    }
    // Init Controls
    function initControls() {
        $('.candidate-success').hide();
        $('.settings-success').hide();
        $('.candidate-error-container').hide();
      
        if ($('.tooltipstered').length < 1) {
            $('.tooltip').tooltipster({
                theme: 'tooltipster-shadow',
                animation: 'fade',
                interactive: true,
                delay: 300
            });
        }

        if ($('.tagified').length < 1) {
            var inputElms = document.querySelectorAll('.tagify');
            if (inputElms.length) {
                inputElms.forEach(inputElm => {
                    tagInputs[inputElm.name] = new Tagify(inputElm);
                    $(inputElm).removeClass('tagify').addClass('tagified')
                });
            }
        }
    }

    function storeInLocalStorage(key, value) {
        if (user && user.id) {
            var rcrm = JSON.parse(localStorage.getItem("rcrm"));
            if (!rcrm) {
                rcrm = initLocalStorage()
            }
            rcrm[user.id][key] = value;
            localStorage.setItem('rcrm', JSON.stringify(rcrm));
        } else {
            throw 'Local storage cannot be accessed without a logged in user';
        }
    }

    function getFromLocalStorage(key = null) {
        if (user && user.id) {
            var rcrm = JSON.parse(localStorage.getItem("rcrm"));
            if (!rcrm) {
                rcrm = initLocalStorage()
            }

            if (!rcrm[user.id]) {
                rcrm = initLocalStorage()
            }

            if (key) {
                if (!rcrm[user.id][key]) {
                    rcrm = initLocalStorage()
                }
            }

            if (key) {
                return JSON.parse(localStorage.getItem('rcrm'))[user.id][key];
            } else {
                return JSON.parse(localStorage.getItem('rcrm'))[user.id];
            }
        } else {
            throw 'Local storage cannot be accessed without a logged in user';
        }
    }

    function initLocalStorage() {
        var rcrm = {};
        rcrm[user.id] = {
            "ctp": true,
            "autoPdf": true,
            "overrideData": true
        };
        localStorage.setItem('rcrm', JSON.stringify(rcrm));
        return JSON.parse(localStorage.getItem('rcrm'));
    }

    /*  
     *Code to be moved to extension in next version update
     */

    document.getElementById('noti_Container').innerHTML = "";
    document.getElementsByClassName('rcrm-nav')[0].classList.add("justify-content-s-b");
    $('.rcrm-add-appointment').siblings('p')[0].textContent = 'Add Meeting';
    $('#appointment_form .rcrm-header').text('Add Meeting')
    $('.btn-exists-add-appointment').each(function (index, element) {
        element.title = "Add Meeting";
    });
    $('#company_form').prepend('<input type="hidden" class="clinkedin" id="company_profilelinkedin" name="company_profilelinkedin">');
    //

    /**
     * Code to move position of extension dynamically:
     * document.getElementsByClassName('rcrm-ext-container')[0].style.left = '0px';
     * document.getElementsByClassName('rcrm-ext-container')[0].style.right = 'calc(100% - 340px)';
     */
}