God.watch do |w|
  w.name     = "clickhax-daemon"
  w.interval = 30.seconds # default
  w.start    = "node clickhax-daemon.js"
#  w.stop     = "killall node clickhax-daemon.js"
  w.dir      = File.dirname(__FILE__)
  w.log      = "clickhax-daemon.log"
  w.pid_file = "clickhax.pid"

  # determine the state on startup
  w.transition(:init, { true => :up, false => :start }) do |on|
    on.condition(:process_running) do |c|
      c.running = true
    end
  end

  # determine when process has finished starting
  w.transition([:start, :restart], :up) do |on|
    on.condition(:process_running) do |c|
      c.running = true
      c.interval = 5.seconds
    end
  
    # failsafe
    on.condition(:tries) do |c|
      c.times = 5
      c.transition = :start
      c.interval = 5.seconds
    end
  end

  # start if process is not running
  w.transition(:up, :start) do |on|
    on.condition(:process_running) do |c|
      c.running = false
    end
  end
end
