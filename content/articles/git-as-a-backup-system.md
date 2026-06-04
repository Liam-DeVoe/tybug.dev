---
title: Git as a backup system
date: 2022-08-23
slug: git-as-a-backup-system
hidden: true
---

For the past few months I've been using git as my backup system for my mac. I'm only backing up my own files (music, code, etc) and not software or system files, so it's not intended to be a drop-in replacement for setting up a new machine.

# Pros / Cons

There's some obvious reasons why you shouldn't do this:

* git can't preserve advanced file permissions like access control list (but does preserve basic rwx file modes)
* git can't commit empty folders
* git wasn't designed to be a backup system (less of a strict negative and more of an icky feeling)
* git has trouble dealing with nested repositories
* git has no builtin backup commands (like "restore this file as of 1 week and 2 days ago")

That said, there are some pros:

* you don't have to learn the syntax of a separate backup system
* very low chance of your backup system (git) becoming unmaintained in the future
* differential backups for free

The first few negatives I listed aren't a big deal for me. I'm the only one who uses my computer, so I don't need to wory about ACL, and all the files I'm backing up are owned by me, so I don't even really need to worry about storing file ownership. Not preserving empty folders is unfortunate, but the number of empty folders I care about on my computer right now is probably less than 2, so I'm ok with letting that go.

The others are more problematic. Git's solution to nested repositories is submodules, which is an entire layer of complication I didn't want to deal with. I think it's easier to simply remove all nested git repositories from your backup before committing. When I say remove, I just mean renaming any `.git` folders to something else - like `._git` - so git doesn't think it's a repository. It'll just track changes to it like any normal file. Then when you want to restore from a backup, you can rename any `._git` folders to `.git` again.

This approach isn't perfect: it effectively means I can't name a folder `._git`. I can't imagine why I would, so I'm fine with this. And if I ever do, I could always change my backups to use `.git_backup_very_unique_string` or something instead.

# Taking Backups

My workflow for backing up looks something like this:

* connect my external harddrive to my mac
* copy the files I want to back up to the external harddrive. Right now I back up the entirety of `~/Desktop`, as well as some select files from my `~/`
* rename all `.git` directories to `._git`, and do the same for any special git files (eg `.gitignore`)
* delete everything that was previously in my backup directory on my external harddrive, except the master `.git` repository
* copy over the new directory into the backup directory
* run `git add . && git commit -a -m "backup mm/dd/yyy"`, replacing with current date

You have to delete the previous backup before replacing it. Otherwise, files which were deleted won't be removed, and git won't think they got deleted.

I wrote [a script](https://github.com/liam-devoe/dotfiles/blob/87e966b263b62c88b9986d92800b6ff1e2303473/bin/backup) which automates steps 3+, so I just have to copy the files I want to back up to `/Volumes/Backup/temporary` and run `cd /Volumes/Backup/computer\ backups/tybug && backup /Volumes/Backup/temporary`, where `Backup` is the name of my external harddrive.

I could automate this further, but I don't see the point since I have to manually connect my external harddrive anyway.

# Is it any good?

Sort of.

The good news is, it totally works. I want to see how my harddrive looked last year? `git checkout 4458befdb9`, where `4458befdb9` was my backup on `06/01/2021`. I want to see what changed since the last backup in a particular directory? `git diff HEAD^ -- Desktop/Liam/Music/Various\ Artists/AD：TRANCE\ 2`.

It's slightly harder to restore a single directory to a previous backup. You have to do something like this:

```bash
# https://stackoverflow.com/a/42224112
git reset HEAD^ -- dir
git checkout -- dir
git clean -fd -- dir
```

But it's not too bad to just stick those three lines into a script. The reason this is necessary is that in git, resetting to a previous commit doesn't clean your working tree from any files that don't exist in that commit. Usually, this is what we want, but since this is a backup we know for a fact there are no stray files and can `git clean` them away.

The biggest downside, though, is that things are just *slow*.

For instance, it takes 20 minutes to clean the backup directory and copy the new backup over from its temporary location to the backup directory. Then `git add .` takes around 10 minutes and `git commit -a -m "mm/dd/yyyy"` takes around 30 minutes. All timings taken from a 140gb backup (with only 20gb of differential changes from the previous backup) on my 14 inch 2021 macbook pro, copying to a 1TB ssd.

In other words, it takes around an hour to take a backup, from start to finish. I can live with this: the entirety of that time is spent in a script, so I can leave it running and forget about it.

The bigger problem is that git itself is slow for large repositories. On my current backup repository (190gb .git folder, 140gb working tree), running `git checkout HEAD^` takes 20 minutes. Even running `git status` took 10 minutes until I enabled git's `manyFiles` flag with `git config --global feature.manyFiles true`. That took it down to 5 seconds most of the time, except when it needs to update caches, which can take 10 minutes again. The cache seems to get invalidated whenever you check out another backup, so it's not that useful. At least running multiple `git status` commands without checking out is much faster with this option enabled.

Git will also decide it needs to garbage collect every third backup or so. This is good - presumably git knows better than I do when things are getting fragmented and need to be repacked - but when it happens it adds even more running time (about 15 minutes) to an already long operation.

# Final Thoughts

Do I regret using git as my backup system? Not really, but I wouldn't recommend it to anyone else. I'm only okay with the slow speeds because I will very rarely need to checkout older backups or compare diffs. Or if I do, I'm fine with dumping the diff to a file (and paying an initial cost of 20 minutes for that to complete) and then examining it outside of git with no additional penalty.

To me, the convenience of familiar syntax and longevity assurance is worth it, but I don't think that would be true for most people. Use an actual backup system designed for backups instead of trying to hammer git into a backup-shaped hole.
